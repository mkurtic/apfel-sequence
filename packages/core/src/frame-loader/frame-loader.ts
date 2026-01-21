import { getFrameHref } from "../utils/url-resolvers/getFrameHref";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import type { BreakpointConfig, FrameLoaderProps, NetworkPolicy } from "../types/scrollSequence";
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

	constructor(config: FrameLoaderProps) {
		this.activeBreakpoint = config.activeBreakpoint;
		this.firstFrame = config.firstFrame;
		this.lastFrame = config.lastFrame;
		this.preloadCount = config.preloadCount;
		this.networkPolicy = config.networkPolicy;
	}

	loadFrame(frameNumber: number): Promise<void> {
		if (!this.activeBreakpoint) return Promise.resolve();

		const index = frameNumber - this.firstFrame;

		// Already loaded or currently loading
		if (this.activeBreakpoint.frames[index] || this.loadingFrames.has(index)) {
			return Promise.resolve();
		}

		this.loadingFrames.add(index);

		return new Promise((resolve) => {
			const img = new Image();

			img.onload = () => {
				this.activeBreakpoint.frames[index] = img;
				this.loadingFrames.delete(index);
				resolve();
			};

			img.onerror = () => {
				this.loadingFrames.delete(index);
				resolve(); // Resolve anyway to not block
			};

			img.src = getFrameHref(this.activeBreakpoint, frameNumber)!;
		});
	}

	async loadFirstFrame(): Promise<void> {
		await this.loadFrame(this.firstFrame);
	}

	async progressiveLoad(): Promise<void> {
		const totalFrames = this.lastFrame - this.firstFrame + 1;
		const batchSize = Math.min(this.preloadCount, totalFrames);

		for (let i = 0; i < totalFrames; i += batchSize) {
			const batch: Promise<void>[] = [];
			for (let j = 0; j < batchSize && i + j < totalFrames; j++) {
				batch.push(this.loadFrame(this.firstFrame + i + j));
			}
			await Promise.all(batch);
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
				this.loadFrame(frame);
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

		const preloadPromises: Promise<void>[] = [];
		for (let i = 0; i < framesToPreload; i++) {
			preloadPromises.push(this.loadFrame(this.firstFrame + i));
		}
		await Promise.all(preloadPromises);
	}

	async progressiveLoadImages(): Promise<void> {
		const totalFrames = this.lastFrame - this.firstFrame + 1;
		const batchSize = Math.min(this.preloadCount, totalFrames);

		for (let i = 0; i < totalFrames; i += batchSize) {
			const batch = [];
			for (let j = 0; j < batchSize && i + j < totalFrames; j++) {
				batch.push(this.loadFrame(this.firstFrame + i + j));
			}
			await Promise.all(batch);
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
