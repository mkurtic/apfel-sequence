import { PrefersReducedMotion } from "./reduce-motion/reduce-motion";
import type { AssetsConfigs, BreakpointConfig, LoadingConfig, ScrollConfig, ScrollSequenceProps } from "./types/scrollSequence";
export type { AssetsConfigs, BreakpointConfig, LoadingConfig, ScrollConfig, ScrollSequenceProps };
import { ScrollEngine } from "./scroll-engine/scroll-engine";
import { ActiveBreakpoint } from "./active-breakpoint/active-breakpoint";
import resolveFallbackFrameUrl from "./utils/url-resolvers/resolveFallbackUrls";
import { FrameLoader } from "./frame-loader/frame-loader";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { CanvasRender } from "./canvas-render/canvas-render";
gsap.registerPlugin(ScrollTrigger);

export class ScrollSequenceEngine {
	private scrollEngine: ScrollEngine | null = null;
	private config: ScrollSequenceProps;
	private scrollConfig?: ScrollConfig;
	private loadingConfig?: LoadingConfig;
	private activeBreakpointManager: ActiveBreakpoint<BreakpointConfig> | null = null;
	private activeBreakpoint: BreakpointConfig | null = null;
	private breakpoints: BreakpointConfig[] = [];
	private canvasRender: CanvasRender;
	private MIN_FRAMES_TO_PRELOAD: number = 5;
	private minFramesToPreload: number = 0;
	private firstFrame: number = 1;
	private lastFrame: number = 2;
	private totalFrames: number = 1;
	private frameLoaderManager: FrameLoader | null = null;
	private tlPreloadFirstChunk: ScrollTrigger | null = null;
	private prefersReducedMotion: PrefersReducedMotion | null = null;
	private dpr: number = 1;
	private resizeObserver: ResizeObserver | null = null;
	constructor(config: ScrollSequenceProps) {
		this.config = config;
		this.breakpoints = [];

		this.prefersReducedMotion = new PrefersReducedMotion();

		this.dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		const canvasRenderProps = {
			canvas: this.config.canvas,
			container: this.config.container,
			dpr: this.dpr,
			drawMode: this.config.drawMode,
		};
		this.canvasRender = new CanvasRender(canvasRenderProps);

		this.init(this.config);
	}

	initFramesLoadings = async () => {
		const fallbackOnly = this.config.networkPolicy === "fallback-only" || this.prefersReducedMotion?.value;

		if (fallbackOnly) return;

		if (!this.frameLoaderManager) return;

		await this.frameLoaderManager.loadFirstFrame();

		if (this.activeBreakpoint) {
			const first = this.activeBreakpoint.frames[0] || this.activeBreakpoint.fallbackFrame || null;
			this.canvasRender.drawFrame(first, this.activeBreakpoint.fallbackFrame || null);
		}

		if (this.loadingConfig?.loadingMode === "lazy" && !fallbackOnly) {
			if (this.loadingConfig.trigger) {
				if (this.tlPreloadFirstChunk) {
					this.tlPreloadFirstChunk.kill();
				}
				this.tlPreloadFirstChunk = ScrollTrigger.create({
					trigger: this.loadingConfig.trigger,
					start: this.loadingConfig.start,
					markers: this.loadingConfig.markers,
					once: true,
					onEnter: async () => {
						await this.frameLoaderManager?.preloadInitialFrames();
					},
				});
				this.frameLoaderManager.initLazyLoading(
					this.loadingConfig.trigger,
					this.loadingConfig.start,
					"100%",
					true,
					this.loadingConfig.markers,
				);
			} else {
				await this.frameLoaderManager.preloadInitialFrames();
			}
		} else {
			await this.frameLoaderManager.progressiveLoadImages();
		}
	};

	init = (config: ScrollSequenceProps) => {
		const fallbackOnly = config.networkPolicy === "fallback-only" || this.prefersReducedMotion?.value;

		if (!config.container) return;

		this.initBreakpointsManager();
		this.scrollConfig = this.normalizeScrollConfig(config.scrollConfig);
		this.loadingConfig = this.normalizeLoadingConfig(config.loadingConfig);

		this.scrollEngine = new ScrollEngine({
			containerRef: config.container,
			totalFrames: fallbackOnly ? 1 : this.totalFrames,
			onFrameChange: fallbackOnly ? () => {} : this.handleFrameChange,
			scrub: this.scrollConfig.scrub,
			start: this.scrollConfig.start,
			end: this.scrollConfig.end,
			markers: this.scrollConfig.markers,
			loadingMode: this.loadingConfig.loadingMode,
			lazyLoadAroundFrame: fallbackOnly ? undefined : () => {},
		});

		if (!this.config.container) return;

		if (this.config.container) {
			this.resizeObserver = new ResizeObserver(() => {
				this.resize();
			});
			this.resizeObserver.observe(this.config.container);
		}
	};

	initBreakpointsManager = () => {
		this.breakpoints = this.normalizeBreakpoints(this.config.assetsConfigs);
		this.activeBreakpointManager = new ActiveBreakpoint(this.breakpoints);
		this.activeBreakpointManager.init();
		this.activeBreakpoint = this.activeBreakpointManager.getActive();
		this.activeBreakpointManager.subscribe(async (breakpoint) => {
			this.activeBreakpoint = breakpoint;

			this.normalizeFramesRange(this.activeBreakpoint);
			this.initFramesLoadingManager();
			await this.initFramesLoadings();
		});
	};

	getFramesRange = (activeBreakpoint: BreakpointConfig) => {
		const start = activeBreakpoint.frameFirstId ?? 1;
		const end = activeBreakpoint.frameLastId ?? start;
		return [start, end, end - start + 1];
	};

	getNormalizedFramesRange = (activeBreakpoint: BreakpointConfig): [number, number, number] => {
		const firstFrame = activeBreakpoint.frameFirstId ?? this.firstFrame;
		const lastFrame = activeBreakpoint.frameLastId ?? this.lastFrame;
		const totalFrames = lastFrame - firstFrame + 1;
		return [firstFrame, lastFrame, totalFrames];
	};

	normalizeFramesRange = (activeBreakpoint: BreakpointConfig) => {
		const [firstFrame, lastFrame, totalFrames] = this.getNormalizedFramesRange(activeBreakpoint);
		this.firstFrame = firstFrame;
		this.lastFrame = lastFrame;
		this.totalFrames = totalFrames;
		this.minFramesToPreload = this.totalFrames < this.MIN_FRAMES_TO_PRELOAD ? this.totalFrames : this.MIN_FRAMES_TO_PRELOAD;
	};

	normalizeBreakpoints = (assetsConfig: AssetsConfigs) => {
		return assetsConfig.map((cfg, index) => ({
			...cfg,
			name: cfg.name || `asset-${index}`,
			frames: new Array((cfg.frameLastId ?? 1) - (cfg.frameFirstId ?? 1) + 1).fill(null) as (HTMLImageElement | null)[],
			fallbackFrameUrl: resolveFallbackFrameUrl(cfg),
			fallbackFrame: null,
			frameDigits: cfg.frameDigits ?? 4,
			frameSuffix: cfg.frameSuffix || "",
			framePrefix: cfg.framePrefix || "",
			breakpointMin: cfg.breakpointMin ?? 0,
			breakpointMax: cfg.breakpointMax ?? Infinity,
		}));
	};

	normalizeScrollConfig = (scrollConfig?: ScrollConfig): ScrollConfig => {
		return {
			markers: scrollConfig?.markers ?? false,
			scrub: scrollConfig?.scrub ?? true,
			start: scrollConfig?.start ?? "top top",
			end: scrollConfig?.end ?? "100%",
		};
	};

	PRELOAD_RATIO = 1 / 3;

	normalizeLoadingConfig = (loadingConfig?: LoadingConfig): LoadingConfig => {
		const normalizedTrigger =
			typeof loadingConfig?.trigger === "string" && loadingConfig.trigger.trim() !== "" ? loadingConfig.trigger : this.config.container;
		return {
			loadingMode: loadingConfig?.loadingMode ?? "lazy",
			preloadCount: Math.min(this.minFramesToPreload, Math.ceil((this.lastFrame - this.firstFrame) * this.PRELOAD_RATIO)),
			trigger: normalizedTrigger,
			start: loadingConfig?.start ?? "top top",
			markers: loadingConfig?.markers ?? false,
		};
	};

	initFramesLoadingManager = () => {
		if (!this.activeBreakpoint) return;
		this.frameLoaderManager = new FrameLoader({
			activeBreakpoint: this.activeBreakpoint,
			firstFrame: this.firstFrame,
			lastFrame: this.lastFrame,
			preloadCount: this.minFramesToPreload,
			networkPolicy: this.config.networkPolicy,
		});
	};

	handleFrameChange = (frameId: number) => {
		if (!this.activeBreakpoint) return;
		const frames = this.activeBreakpoint?.frames;
		if (!frames || frames.length === 0) return;

		const frame = frames[frameId];
		const fallback = this.activeBreakpoint?.fallbackFrame;

		if (!frame && !fallback) return; // nothing to draw yet
		this.canvasRender.drawFrame(this.activeBreakpoint.frames[frameId], this.activeBreakpoint.fallbackFrame);
	};

	resize = () => {
		this.canvasRender.resizeCanvas();
	};

	destroy = () => {
		this.tlPreloadFirstChunk?.kill();
		this.scrollEngine?.destroy();
		this.frameLoaderManager?.destroy();

		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		this.activeBreakpointManager?.destroy();
		this.prefersReducedMotion?.destroy();
	};
}
