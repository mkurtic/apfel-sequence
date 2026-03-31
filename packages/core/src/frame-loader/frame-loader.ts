import { getFrameHref } from "../utils/url-resolvers/getFrameHref";
import type { BreakpointConfig, FrameLoaderProps, NetworkPolicy, Frame, RenderableImage } from "../types/apfelSequence";
import { Emitter } from "../utils/emitter/emitter";
import { ScrollScrub } from "../scroll-engine/scroll-trigger";

class FrameLoader {
	private emitter: Emitter;
	private activeBreakpoint: BreakpointConfig;
	private firstFrame: number;
	private lastFrame: number;
	private preloadCount: number;
	private networkPolicy: NetworkPolicy | undefined;
	private activeRequests = new Map<number, Promise<void>>();
	private abortControllers = new Map<number, AbortController>();
	private lazyLoadingTL: ScrollScrub | null = null;
	private maxRetries: number;
	private retryDelay: number;
	private queue: { frameNumber: number; resolve: () => void; reject: (err: unknown) => void }[] = [];
	private isProcessing: boolean = false;
	constructor(config: FrameLoaderProps) {
		this.emitter = config.emitter;
		this.activeBreakpoint = config.activeBreakpoint;
		this.firstFrame = config.firstFrame;
		this.lastFrame = config.lastFrame;
		this.preloadCount = config.preloadCount;
		this.networkPolicy = config.networkPolicy;
		this.maxRetries = config.maxRetries;
		this.retryDelay = config.retryDelay;
	}


	async loadFrame(
		frameNumber: number,
		priority: "sequential" | "parallel" = "sequential"
	): Promise<void> {
		if (priority === "parallel") {
			return this.processFrameLoad(frameNumber);
		}
		return new Promise((resolve, reject) => {
			this.queue.push({ frameNumber, resolve, reject });
			this.processQueue();
		});
	}

	private async processQueue() {
		if (this.isProcessing || this.queue.length === 0) return;

		this.isProcessing = true;
		const item = this.queue.shift();

		if (item) {
			try {
				await this.processFrameLoad(item.frameNumber);
				item.resolve();
			} catch (err) {
				item.reject(err);
			}
		}

		this.isProcessing = false;
		this.processQueue();
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

		let lastError: unknown;

		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				const img = await this.loadInternal(src, controller.signal);
				const endTime = performance.now();
				const stat: Frame = {
					frameNumber,
					startTime,
					endTime,
					duration: endTime - startTime,
					status: "success",
					url: src,
					image: img,
					attempts: attempt,
					index: index,
				};
				this.activeBreakpoint.frames[index] = stat;
				this.emitter.emit("frameLoaded", stat);
				this.abortControllers.delete(index);
				return;
			} catch (error) {
				lastError = error;

				if (error instanceof Error && error.name === "AbortError") {
					this.abortControllers.delete(index);
					return; // exit without emitting failure
				}

				if (attempt < this.maxRetries) {
					const endTime = performance.now();
					const stat: Frame = {
						frameNumber,
						startTime,
						endTime,
						duration: endTime - startTime,
						status: "error",
						url: src,
						image: null,
						attempts: attempt,
						index: index,
					};
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
			status: "error",
			url: src,
			image: null,
			attempts: this.maxRetries,
			index: index,
		};
		this.emitter.emit("frameFailed", stat);

		this.activeBreakpoint.frames[index] = stat;
		this.abortControllers.delete(index);
	}

	private async loadInternal(src: string, signal?: AbortSignal): Promise<RenderableImage> {
		try {
			const response = await fetch(src, { signal, mode: "cors" });
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const blob = await response.blob();
			return await createImageBitmap(blob);
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				throw error; // Re-throw so caller handles intentional abort
			}
			// Fallback if createImageBitmap is unsupported or CORS fetch fails
		}

		return new Promise((resolve, reject) => {
			const img = new Image();
			
			const abortHandler = () => {
				img.src = ""; // Cancels standard download in most browsers
				const err = new Error("AbortError");
				err.name = "AbortError";
				onFail(err);
			};

			if (signal) {
				signal.addEventListener("abort", abortHandler);
				if (signal.aborted) {
					abortHandler();
					return;
				}
			}

			const cleanUp = () => {
				img.onload = null;
				img.onerror = null;
				if (signal) {
					signal.removeEventListener("abort", abortHandler);
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

			if (typeof (img as HTMLImageElement).decode === "function") {
				img.src = src;
				img.decode()
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
		if (!this.activeBreakpoint || this.networkPolicy === "fallback-only") return;

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

		for (let frame = startFrame; frame <= endFrame; frame++) {
			const index = frame - this.firstFrame;
			if (!this.activeBreakpoint.frames[index]) {
				this.loadFrame(frame, "parallel");
			}
		}
	}

	initLazyLoading = (
		trigger: HTMLElement | string,
		start: string = "top top",
		end: string = "100%",
		scrub: boolean = true,
		markers: boolean = false
	): void => {
		const totalFrames = this.lastFrame - this.firstFrame + 1;
		const triggerEl = typeof trigger === "string" ? document.querySelector<HTMLElement>(trigger) : trigger;
		if (!triggerEl) return;

		this.lazyLoadingTL?.destroy();
		this.lazyLoadingTL = new ScrollScrub({
			trigger: triggerEl,
			start,
			end,
			scrub,
			onUpdate: ({ progress }) => {
				const frameIndex = Math.floor(progress * (totalFrames - 1));
				if (this.lazyLoadAroundFrame) {
					this.lazyLoadAroundFrame(frameIndex);
				}
			},
		});
		this.lazyLoadingTL.init();
	};

	async preloadInitialFrames(): Promise<void> {
		const totalFrames = this.lastFrame - this.firstFrame + 1;
		const framesToPreload = Math.min(this.preloadCount, totalFrames);

		for (let i = 0; i < framesToPreload; i++) {
			await this.loadFrame(this.firstFrame + i);
		}
	}

	destroy(): void {
		if (this.lazyLoadingTL) {
			this.lazyLoadingTL.destroy();
			this.lazyLoadingTL = null;
		}
		for (const controller of this.abortControllers.values()) {
			controller.abort();
		}
		this.abortControllers.clear();
		this.activeRequests.clear();
	}
}

export { FrameLoader };
