import { getFrameHref } from "../utils/url-resolvers/getFrameHref";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import type { BreakpointConfig, FrameLoaderProps, NetworkPolicy, Frame } from "../types/scrollSequence";
gsap.registerPlugin(ScrollTrigger);

class FrameLoader {
	private firstFrameLoaded: boolean = false;
	private activeBreakpoint: BreakpointConfig;
	private firstFrame: number;
	private lastFrame: number;
	private preloadCount: number;
	private networkPolicy: NetworkPolicy | undefined;
	private loadingFrames: Set<number> = new Set();
	private lazyLoadingTL: ScrollTrigger | null = null;
	private onFrameLoaded?: (stat: Frame) => void;
	private maxRetries: number;
	private retryDelay: number;

	constructor(config: FrameLoaderProps) {
		this.activeBreakpoint = config.activeBreakpoint;
		this.firstFrame = config.firstFrame;
		this.lastFrame = config.lastFrame;
		this.preloadCount = config.preloadCount;
		this.networkPolicy = config.networkPolicy;
		this.onFrameLoaded = config.onFrameLoaded;
		this.maxRetries = config.maxRetries;
		this.retryDelay = config.retryDelay;
	}
	private queue: { frameNumber: number; resolve: () => void; reject: (err: unknown) => void }[] = [];
	private isProcessing: boolean = false;

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

	private async processFrameLoad(frameNumber: number): Promise<void> {
		if (!this.activeBreakpoint) return;

		const index = frameNumber - this.firstFrame;

		if (this.activeBreakpoint.frames[index] || this.loadingFrames.has(index)) {
			return;
		}

		this.loadingFrames.add(index);
		const startTime = performance.now();
		const src = getFrameHref(this.activeBreakpoint, frameNumber)!;

		let lastError: unknown;

		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				const img = await this.loadInternal(src);
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
				};
				if (this.onFrameLoaded) this.onFrameLoaded(stat);
				console.log("Frame loaded:", stat);

				this.activeBreakpoint.frames[index] = stat;
				this.loadingFrames.delete(index);
			} catch (error) {
				lastError = error;
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
					};
					console.warn(`Frame load failed (attempt ${attempt}/${this.maxRetries}):`, stat);

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
		};
		if (this.onFrameLoaded) this.onFrameLoaded(stat);
		console.error("Frame failed to load:", stat);

		this.activeBreakpoint.frames[index] = stat;
		this.loadingFrames.delete(index);
	}

	private loadInternal(src: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = (e) => reject(e);
			img.src = src;
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
		if (!trigger) return;
		this.lazyLoadingTL?.kill();
		this.lazyLoadingTL = ScrollTrigger.create({
			trigger: trigger,
			start,
			end,
			scrub,
			markers,
			onUpdate: (self) => {
				const frameIndex = Math.floor(self.progress * (totalFrames - 1));
				if (this.lazyLoadAroundFrame) {
					this.lazyLoadAroundFrame(frameIndex);
				}
			},
		});
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
			this.lazyLoadingTL.kill();
			this.lazyLoadingTL = null;
		}
		this.loadingFrames.clear();
	}
}

export { FrameLoader };
