import { PrefersReducedMotion } from './reduce-motion/reduce-motion';
import type {
	AssetsConfig,
	BreakpointConfig,
	LoadingConfig,
	ScrollConfig,
	ApfelSequenceProps,
	Frame,
	DrawMode
} from './types/apfelSequence';
export type {
	AssetsConfig,
	BreakpointConfig,
	LoadingConfig,
	ScrollConfig,
	ApfelSequenceProps,
	DrawMode
};
import { ScrollEngine } from './scroll-engine/scroll-engine';
import { ActiveBreakpoint } from './active-breakpoint/active-breakpoint';
import resolveFallbackFrameUrl from './utils/url-resolvers/resolveFallbackUrls';
import { FrameLoader } from './frame-loader/frame-loader';
import { ScrollScrub } from './scroll-engine/scroll-trigger';
import { CanvasRender } from './canvas-render/canvas-render';
import { Emitter } from './utils/emitter/emitter';

export class ApfelSequenceEngine {
	private scrollEngine: ScrollEngine | null = null;
	private config: ApfelSequenceProps;
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
	private tlPreloadFirstChunk: ScrollScrub | null = null;
	private prefersReducedMotion: PrefersReducedMotion | null = null;
	private dpr: number = 1;
	private resizeObserver: ResizeObserver | null = null;
	private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
	private clearCacheOnBreakpointChange: boolean = false;
	private isTouchDevice: boolean = false;
	private emitter: Emitter;
	constructor(config: ApfelSequenceProps) {
		this.emitter = new Emitter();
		this.config = config;
		this.breakpoints = [];
		this.isTouchDevice =
			typeof window !== 'undefined' &&
			window.matchMedia('(hover: none) and (pointer: coarse)').matches;

		this.prefersReducedMotion = new PrefersReducedMotion(this.emitter);
		this.prefersReducedMotion.init();

		this.emitter.subscribe('motionPreferenceChanged', () => {
			this.initFramesLoadings();
		});

		this.emitter.subscribe('breakpointChanged', this.handleBreakpointChanged);
		this.emitter.subscribe('frameLoaded', this.handleFrameLoaded);

		this.clearCacheOnBreakpointChange = config.clearCacheOnBreakpointChange ?? false;

		this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
		const canvasRenderProps = {
			emitter: this.emitter,
			canvas: this.config.canvas,
			container: this.config.container,
			dpr: this.dpr,
			drawMode: this.config.drawMode
		};
		this.canvasRender = new CanvasRender(canvasRenderProps);

		this.init(this.config);
	}

	initFramesLoadings = async () => {
		const fallbackOnly =
			this.config.networkPolicy === 'fallback-only' || this.prefersReducedMotion?.value;

		if (fallbackOnly) return;

		if (!this.frameLoaderManager) return;

		await this.frameLoaderManager.loadFirstFrame();

		if (this.activeBreakpoint) {
			const first =
				this.activeBreakpoint.frames[0]?.image || this.activeBreakpoint.fallbackFrame || null;
			this.emitter.emit('drawFrame', first, this.activeBreakpoint.fallbackFrame || null);
		}

		if (this.loadingConfig?.loadingMode === 'lazy' && !fallbackOnly) {
			if (this.loadingConfig.trigger) {
				if (this.tlPreloadFirstChunk) {
					this.tlPreloadFirstChunk.destroy();
				}
				const triggerEl =
					typeof this.loadingConfig.trigger === 'string'
						? document.querySelector<HTMLElement>(this.loadingConfig.trigger)
						: this.loadingConfig.trigger;
				if (triggerEl) {
					this.tlPreloadFirstChunk = new ScrollScrub({
						trigger: triggerEl,
						start: this.loadingConfig.start,
						end: '100%',
						onUpdate: () => {},
						onEnter: async () => {
							await this.frameLoaderManager?.preloadInitialFrames();
							// One-shot: destroy after first fire
							this.tlPreloadFirstChunk?.destroy();
							this.tlPreloadFirstChunk = null;
						}
					});
					this.tlPreloadFirstChunk.init();
				}
				this.frameLoaderManager.initLazyLoading(
					this.loadingConfig.trigger,
					this.loadingConfig.start,
					'100%',
					true,
					this.loadingConfig.markers
				);
			} else {
				await this.frameLoaderManager.preloadInitialFrames();
			}
		} else {
			await this.frameLoaderManager.progressiveLoad();
		}
	};

	init = (config: ApfelSequenceProps) => {
		const fallbackOnly =
			config.networkPolicy === 'fallback-only' || this.prefersReducedMotion?.value;

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
			lazyLoadAroundFrame: fallbackOnly ? undefined : () => {}
		});

		this.resizeObserver = new ResizeObserver(() => {
			this.resize();
		});
		this.resizeObserver.observe(this.config.container);
	};

	initBreakpointsManager = () => {
		if (!this.config.assetsConfig || !Array.isArray(this.config.assetsConfig)) {
			throw new Error(
				'ApfelSequence: assetsConfig is required and must be an array. Please check your options.'
			);
		}
		this.breakpoints = this.normalizeBreakpoints(this.config.assetsConfig);
		this.activeBreakpointManager = new ActiveBreakpoint(this.breakpoints, this.emitter);
		this.activeBreakpointManager.init();
	};

	clearUnactiveBreakpoints = () => {
		if (!this.activeBreakpoint) return;
		this.breakpoints.forEach((breakpoint) => {
			if (breakpoint.name !== this.activeBreakpoint?.name) {
				breakpoint.frames.forEach((frame) => {
					if (!frame || !frame.image) return;

					if (frame.image instanceof HTMLImageElement) {
						if (frame.image.src.startsWith('blob:')) {
							URL.revokeObjectURL(frame.image.src);
						}
						frame.image.src = '';
						frame.image.onload = null;
						frame.image.onerror = null;
					} else if (typeof ImageBitmap !== 'undefined' && frame.image instanceof ImageBitmap) {
						frame.image.close(); // Immediate GPU memory clean up
					}

					frame.image = null;
				});
				breakpoint.frames = [];
			}
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

	normalizeFramesRange = (activeBreakpoint: BreakpointConfig): void => {
		const [firstFrame, lastFrame, totalFrames] = this.getNormalizedFramesRange(activeBreakpoint);
		this.firstFrame = firstFrame;
		this.lastFrame = lastFrame;
		this.totalFrames = totalFrames;
		this.minFramesToPreload =
			this.totalFrames < this.MIN_FRAMES_TO_PRELOAD ? this.totalFrames : this.MIN_FRAMES_TO_PRELOAD;
	};

	normalizeBreakpoints = (assetsConfig: AssetsConfig) => {
		return assetsConfig.map((cfg, index) => ({
			...cfg,
			name: cfg.name || `asset-${index}`,
			frames: new Array((cfg.frameLastId ?? 1) - (cfg.frameFirstId ?? 1) + 1).fill(
				null
			) as (Frame | null)[],
			fallbackFrameUrl: resolveFallbackFrameUrl(cfg),
			fallbackFrame: null,
			frameDigits: cfg.frameDigits ?? 4,
			frameSuffix: cfg.frameSuffix || '',
			framePrefix: cfg.framePrefix || '',
			breakpointMin: cfg.breakpointMin ?? 0,
			breakpointMax: cfg.breakpointMax ?? Infinity
		}));
	};

	normalizeScrollConfig = (scrollConfig?: ScrollConfig): ScrollConfig => {
		return {
			markers: scrollConfig?.markers ?? false,
			scrub: scrollConfig?.scrub ?? true,
			start: scrollConfig?.start ?? 'top top',
			end: scrollConfig?.end ?? '100%'
		};
	};

	PRELOAD_RATIO = 1 / 3;

	normalizeLoadingConfig = (loadingConfig?: LoadingConfig): LoadingConfig => {
		const normalizedTrigger =
			typeof loadingConfig?.trigger === 'string' && loadingConfig.trigger.trim() !== ''
				? loadingConfig.trigger
				: this.config.container;
		return {
			loadingMode: loadingConfig?.loadingMode ?? 'lazy',
			preloadCount: Math.min(
				this.minFramesToPreload,
				Math.ceil((this.lastFrame - this.firstFrame) * this.PRELOAD_RATIO)
			),
			trigger: normalizedTrigger,
			start: loadingConfig?.start ?? 'top top',
			markers: loadingConfig?.markers ?? false,
			maxRetries: loadingConfig?.maxRetries ?? 3,
			retryDelay: loadingConfig?.retryDelay ?? 200
		};
	};

	initFramesLoadingManager = () => {
		if (!this.activeBreakpoint) return;

		this.frameLoaderManager?.destroy();
		this.frameLoaderManager = new FrameLoader({
			emitter: this.emitter,
			activeBreakpoint: this.activeBreakpoint,
			firstFrame: this.firstFrame,
			lastFrame: this.lastFrame,
			preloadCount: this.loadingConfig?.preloadCount ?? this.minFramesToPreload,
			networkPolicy: this.config.networkPolicy,
			maxRetries: this.loadingConfig?.maxRetries ?? 3,
			retryDelay: this.loadingConfig?.retryDelay ?? 200
		});
	};

	private handleBreakpointChanged = async (breakpoint: BreakpointConfig) => {
		this.activeBreakpoint = breakpoint;

		this.normalizeFramesRange(this.activeBreakpoint);
		this.initFramesLoadingManager();
		await this.initFramesLoadings();

		if (this.clearCacheOnBreakpointChange) {
			this.clearUnactiveBreakpoints();
		}
	};

	private handleFrameLoaded = (frame: Frame) => {
		this.loadingConfig?.onFrameLoaded?.(frame);
	};

	/**
	 * Shallow-compares two plain objects by value.
	 * Returns true if both are the same reference, or if all their enumerable
	 * keys exist on both sides with strictly-equal values.
	 */
	private shallowEqual(
		a: Record<string, unknown> | undefined,
		b: Record<string, unknown> | undefined
	): boolean {
		if (a === b) return true;
		if (!a || !b) return false;
		const keysA = Object.keys(a);
		const keysB = Object.keys(b);
		if (keysA.length !== keysB.length) return false;
		return keysA.every((k) => a[k] === b[k]);
	}

	public updateConfig = (newConfig: Partial<ApfelSequenceProps>) => {
		const prev = this.config;
		this.config = { ...this.config, ...newConfig };
		this.clearCacheOnBreakpointChange = this.config.clearCacheOnBreakpointChange ?? false;

		// DOM references or asset definitions changed → full teardown and reinit.
		// These changes are structural and cannot be patched in place.
		const needsFullReinit =
			prev.assetsConfig !== this.config.assetsConfig ||
			prev.networkPolicy !== this.config.networkPolicy ||
			prev.container !== this.config.container ||
			prev.canvas !== this.config.canvas;

		if (needsFullReinit) {
			this.tlPreloadFirstChunk?.destroy();
			this.scrollEngine?.destroy();
			this.frameLoaderManager?.destroy();
			this.activeBreakpointManager?.destroy();
			if (this.resizeObserver) {
				this.resizeObserver.disconnect();
				this.resizeObserver = null;
			}
			this.init(this.config);
			return;
		}

		// Only scroll positions changed → rebuild ScrollEngine, leave frames untouched.
		if (
			!this.shallowEqual(
				prev.scrollConfig as Record<string, unknown>,
				this.config.scrollConfig as Record<string, unknown>
			)
		) {
			this.scrollEngine?.destroy();
			this.scrollConfig = this.normalizeScrollConfig(this.config.scrollConfig);
			const fallbackOnly =
				this.config.networkPolicy === 'fallback-only' || this.prefersReducedMotion?.value;
			this.scrollEngine = new ScrollEngine({
				containerRef: this.config.container,
				totalFrames: fallbackOnly ? 1 : this.totalFrames,
				onFrameChange: fallbackOnly ? () => {} : this.handleFrameChange,
				scrub: this.scrollConfig.scrub,
				start: this.scrollConfig.start,
				end: this.scrollConfig.end,
				markers: this.scrollConfig.markers,
				loadingMode: this.loadingConfig?.loadingMode,
				lazyLoadAroundFrame: fallbackOnly ? undefined : () => {}
			});
		}

		// drawMode only affects how the current frame is rendered — no reinit needed.
		if (prev.drawMode !== this.config.drawMode) {
			this.canvasRender.setDrawMode(this.config.drawMode);
		}
	};

	handleFrameChange = (frameId: number) => {
		if (!this.activeBreakpoint) return;
		const frames = this.activeBreakpoint?.frames;
		if (!frames || frames.length === 0) return;

		const frame = frames[frameId];
		const fallback = this.activeBreakpoint?.fallbackFrame;

		if (!frame?.image && !fallback) return; // nothing to draw yet
		this.emitter.emit('drawFrame', frame?.image || null, this.activeBreakpoint.fallbackFrame);
	};

	resize = () => {
		if (this.isTouchDevice) {
			if (this.resizeTimeout) {
				clearTimeout(this.resizeTimeout);
			}
			this.resizeTimeout = setTimeout(() => {
				this.canvasRender.resizeCanvas();
			}, 150);
		} else {
			this.canvasRender.resizeCanvas();
		}
	};

	destroy = () => {
		this.tlPreloadFirstChunk?.destroy();
		this.scrollEngine?.destroy();
		this.frameLoaderManager?.destroy();

		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		if (this.resizeTimeout) {
			clearTimeout(this.resizeTimeout);
		}

		this.activeBreakpointManager?.destroy();
		this.prefersReducedMotion?.destroy();
	};
}
