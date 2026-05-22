import { getFrameHref } from '../utils/url-resolvers/getFrameHref';
import type {
	BreakpointConfig,
	FrameLoaderProps,
	NetworkPolicy,
	Frame,
	RenderableImage,
	ApfelEmitter
} from '../types/apfelSequence';

class FrameLoader {
	private emitter: ApfelEmitter;
	private activeBreakpoint: BreakpointConfig;
	private firstFrame: number;
	private lastFrame: number;
	private preloadCount: number;
	private networkPolicy: NetworkPolicy | undefined;
	private activeRequests = new Map<number, Promise<void>>();
	private abortControllers = new Map<number, AbortController>();

	private maxRetries: number;
	private retryDelay: number;
	private maxConcurrency: number;
	private activeDownloads: number = 0;
	private queue: {
		frameNumber: number;
		priority: 'high' | 'low';
		resolve: () => void;
		reject: (err: unknown) => void;
	}[] = [];

	constructor(config: FrameLoaderProps) {
		this.emitter = config.emitter;
		this.activeBreakpoint = config.activeBreakpoint;
		this.firstFrame = config.firstFrame;
		this.lastFrame = config.lastFrame;
		this.preloadCount = config.preloadCount;
		this.networkPolicy = config.networkPolicy;
		this.maxRetries = config.maxRetries;
		this.retryDelay = config.retryDelay;
		this.maxConcurrency = config.maxConcurrency || 5;
	}

	async loadFrame(
		frameNumber: number,
		priority: 'sequential' | 'parallel' = 'sequential'
	): Promise<void> {
		if (!this.activeBreakpoint) return Promise.resolve();

		const index = frameNumber - this.firstFrame;

		// Frame is fully cached in memory
		if (this.activeBreakpoint.frames[index]) {
			return Promise.resolve();
		}

		// If a fetch is already on-going for this frame, return its existing Promise
		if (this.activeRequests.has(index)) {
			return this.activeRequests.get(index)!;
		}

		return new Promise((resolve, reject) => {
			const internalPriority: 'high' | 'low' = priority === 'parallel' ? 'high' : 'low';

			const existingItem = this.queue.find((q) => q.frameNumber === frameNumber);
			if (existingItem) {
				// If already in queue, just wrap its resolution
				const origResolve = existingItem.resolve;
				const origReject = existingItem.reject;
				existingItem.resolve = () => {
					origResolve();
					resolve();
				};
				existingItem.reject = (err) => {
					origReject(err);
					reject(err);
				};

				// Upgrade priority if needed
				if (internalPriority === 'high' && existingItem.priority === 'low') {
					existingItem.priority = 'high';
					this.queue = this.queue.filter((q) => q !== existingItem);
					this.queue.unshift(existingItem);
				}
				return;
			}

			const task = { frameNumber, priority: internalPriority, resolve, reject };
			if (internalPriority === 'high') {
				this.queue.unshift(task); // Preempt
			} else {
				this.queue.push(task); // Back of queue
			}

			this.processQueue();
		});
	}

	private async processQueue() {
		while (this.activeDownloads < this.maxConcurrency && this.queue.length > 0) {
			const item = this.queue.shift();
			if (!item) continue;

			this.activeDownloads++;

			this.processFrameLoad(item.frameNumber)
				.then(() => item.resolve())
				.catch((err) => item.reject(err))
				.finally(() => {
					this.activeDownloads--;
					this.processQueue();
				});
		}
	}

	private processFrameLoad(frameNumber: number): Promise<void> {
		if (!this.activeBreakpoint) return Promise.resolve();

		const index = frameNumber - this.firstFrame;

		// Frame is fully cached in memory
		if (this.activeBreakpoint.frames[index]) {
			return Promise.resolve();
		}

		// If a fetch is already on-going for this frame, return its existing Promise
		if (this.activeRequests.has(index)) {
			return this.activeRequests.get(index)!;
		}

		// Initiate the network fetch and queue the Promise
		const requestPromise = this.executeNetworkFetch(frameNumber, index);
		this.activeRequests.set(index, requestPromise);

		// Clean up the queue mapping once resolved
		requestPromise.finally(() => {
			this.activeRequests.delete(index);
		});

		return requestPromise;
	}

	private async executeNetworkFetch(frameNumber: number, index: number): Promise<void> {
		const startTime = performance.now();
		const src = getFrameHref(this.activeBreakpoint, frameNumber)!;

		const controller = new AbortController();
		this.abortControllers.set(index, controller);

		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				const img = await this.loadInternal(src, controller.signal);
				const endTime = performance.now();
				const stat: Frame = {
					frameNumber,
					startTime,
					endTime,
					duration: endTime - startTime,
					status: 'success',
					url: src,
					image: img,
					attempts: attempt,
					index: index
				};
				this.activeBreakpoint.frames[index] = stat;
				this.emitter.emit('frameLoaded', stat);
				this.abortControllers.delete(index);
				return;
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') {
					this.abortControllers.delete(index);
					return; // exit without emitting failure
				}

				if (attempt < this.maxRetries) {
					/*
					const endTime = performance.now();
					const stat: Frame = {
						frameNumber,
						startTime,
						endTime,
						duration: endTime - startTime,
						status: 'error',
						url: src,
						image: null,
						attempts: attempt,
						index: index
					};
					*/
					await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
					continue;
				}
			}
		}

		// If we reach here, all retries failed
		const endTime = performance.now();
		const stat: Frame = {
			frameNumber,
			startTime,
			endTime,
			duration: endTime - startTime,
			status: 'error',
			url: src,
			image: null,
			attempts: this.maxRetries,
			index: index
		};
		this.emitter.emit('frameFailed', stat);

		this.activeBreakpoint.frames[index] = stat;
		this.abortControllers.delete(index);
	}

	private async loadInternal(src: string, signal?: AbortSignal): Promise<RenderableImage> {
		try {
			const response = await fetch(src, { signal, mode: 'cors' });
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const blob = await response.blob();
			return await createImageBitmap(blob);
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw error; // Re-throw so caller handles intentional abort
			}
			// Fallback if createImageBitmap is unsupported or CORS fetch fails
		}

		return new Promise((resolve, reject) => {
			const img = new Image();

			const abortHandler = () => {
				img.src = ''; // Cancels standard download in most browsers
				const err = new Error('AbortError');
				err.name = 'AbortError';
				onFail(err);
			};

			if (signal) {
				signal.addEventListener('abort', abortHandler);
				if (signal.aborted) {
					abortHandler();
					return;
				}
			}

			const cleanUp = () => {
				img.onload = null;
				img.onerror = null;
				if (signal) {
					signal.removeEventListener('abort', abortHandler);
				}
			};

			const onSuccess = () => {
				cleanUp();
				resolve(img);
			};

			const onFail = (err: unknown) => {
				cleanUp();
				reject(err);
			};

			if (typeof (img as HTMLImageElement).decode === 'function') {
				img.src = src;
				img
					.decode()
					.then(onSuccess)
					.catch(() => {
						if (img.complete) {
							onSuccess();
							return;
						}
						img.onload = onSuccess;
						img.onerror = onFail;
					});
			} else {
				img.onload = onSuccess;
				img.onerror = onFail;
				img.src = src;
			}
		});
	}

	async loadFirstFrame(): Promise<void> {
		await this.loadFrame(this.firstFrame);
	}

	async progressiveLoad(): Promise<void> {
		const totalFrames = this.lastFrame - this.firstFrame + 1;

		for (let i = 0; i < totalFrames; i++) {
			await this.loadFrame(this.firstFrame + i);
		}
	}

	lazyLoadAroundFrame(frameIndex: number): void {
		if (!this.activeBreakpoint || this.networkPolicy === 'fallback-only') return;

		const currentFrame = this.firstFrame + frameIndex;
		const lookaheadFrames = Math.ceil((this.lastFrame - this.firstFrame) / 3);

		const startFrame = Math.max(this.firstFrame, currentFrame - lookaheadFrames);
		const endFrame = Math.min(this.lastFrame, currentFrame + lookaheadFrames);

		// Sweep unneeded active fetches
		for (const [activeIndex, controller] of this.abortControllers.entries()) {
			const activeFrame = this.firstFrame + activeIndex;
			if (activeFrame < startFrame || activeFrame > endFrame) {
				controller.abort();
				this.abortControllers.delete(activeIndex);
				this.activeRequests.delete(activeIndex);
			}
		}

		// Sweep unneeded pending tasks in the queue
		this.queue = this.queue.filter((task) => {
			if (
				task.priority === 'high' &&
				(task.frameNumber < startFrame || task.frameNumber > endFrame)
			) {
				const err = new Error('AbortError');
				err.name = 'AbortError';
				task.reject(err);
				return false; // remove from queue
			}
			return true; // keep low priority (sequential background tasks) and valid high priority tasks
		});

		for (let frame = startFrame; frame <= endFrame; frame++) {
			const index = frame - this.firstFrame;
			if (!this.activeBreakpoint.frames[index]) {
				this.loadFrame(frame, 'parallel').catch((err) => {
					if (err instanceof Error && err.name !== 'AbortError') console.error(err);
				});
			}
		}
	}

	async preloadInitialFrames(): Promise<void> {
		const totalFrames = this.lastFrame - this.firstFrame + 1;
		const framesToPreload = Math.min(this.preloadCount, totalFrames);

		for (let i = 0; i < framesToPreload; i++) {
			await this.loadFrame(this.firstFrame + i);
		}
	}

	destroy(): void {
		for (const controller of this.abortControllers.values()) {
			controller.abort();
		}
		this.abortControllers.clear();
		this.activeRequests.clear();

		for (const task of this.queue) {
			const err = new Error('AbortError');
			err.name = 'AbortError';
			task.reject(err);
		}
		this.queue = [];
	}
}

export { FrameLoader };
