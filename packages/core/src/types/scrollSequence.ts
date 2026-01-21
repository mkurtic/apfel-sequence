export type DrawMode = "cover" | "contain";
export type NetworkPolicy = "adaptive" | "fallback-only";

export interface AssetsConfig {
	/** Unique name for the asset */
	name: string;
	/** Base URL of the frames */
	url: string;
	/** First frame number (defaults to 1 if not provided) */
	frameFirstId?: number;
	/** Last frame number */
	frameLastId: number;
	/** Number of digits for zero-padding frame numbers (default 4) */
	frameDigits?: number;
	/** Prefix added to frame filenames */
	framePrefix?: string;
	/** Suffix added to frame filenames (like .jpg) */
	frameSuffix?: string;
	/** Fallback frame to display before frames load */
	frameFallback?: number | string;
	/** Whether to render the canvas for this asset */
	renderCanvas?: boolean;
	/** Minimum breakpoint (window width) for this asset */
	breakpointMin?: number;
	/** Maximum breakpoint (window width) for this asset */
	breakpointMax?: number;
}

/** Array of assets */
export type AssetsConfigs = AssetsConfig[];

/**
 * Configuration for loading frames in the scroll sequence.
 */
export interface LoadingConfig {
	/** Loading strategy: 'eager' preloads immediately, 'lazy' preloads when triggered */
	loadingMode?: "eager" | "lazy";

	/** Number of frames to preload initially (defaults calculated in component if not provided) */
	preloadCount?: number;

	/** CSS selector to trigger lazy preload (only used when loadingMode = 'lazy') */
	trigger?: HTMLElement | string;

	/** ScrollTrigger start position for lazy preload */
	triggerStart?: string;

	/** Whether to show markers for debugging ScrollTrigger preload */
	triggerMarkers?: boolean;
}

/**
 * ScrollTrigger-related configuration for the scroll sequence.
 */
export interface ScrollConfig {
	/** Show ScrollTrigger markers for debugging */
	scrollTriggerMarker?: boolean;

	/** Enable scrub behavior for ScrollTrigger */
	scrollTriggerScrub?: boolean;

	/** ScrollTrigger start position (default: 'top top') */
	scrollTriggerStart?: string;

	/** ScrollTrigger end position (default: '100%') */
	scrollTriggerEnd?: string;
}

/**
 * Props for the ScrollSequenceEngine component
 */

export interface ScrollSequenceEngine {
	/** Array of assets to display */
	assetsConfigs: AssetsConfigs;

	/** Optional loading configuration */
	loadingConfig?: LoadingConfig;

	/** Optional scroll configuration */
	scrollConfig?: ScrollConfig;

	/** Optional network quality */
	networkPolicy?: NetworkPolicy;

	/** Optional sequence alt description */
	alt?: string;

	/** Optional Drawing mode for the canvas */
	drawMode?: DrawMode;

	/* HTMLCanvasElement */
	canvas: HTMLCanvasElement;

	/* Canvas's container */
	container: HTMLElement;
}

/**
 * Props for the ScrollSequence component
 */
export interface ScrollSequenceProps {
	/** Array of assets to display */
	assetsConfigs: AssetsConfigs;

	/** Optional loading configuration */
	loadingConfig?: LoadingConfig;

	/** Optional scroll configuration */
	scrollConfig?: ScrollConfig;

	/** Optional network quality */
	networkPolicy?: NetworkPolicy;

	/** Optional sequence alt description */
	alt?: string;

	/** Optional Drawing mode for the canvas */
	drawMode?: DrawMode;

	/* HTMLCanvasElement */
	canvas: HTMLCanvasElement;

	/* Canvas's container */
	container: HTMLElement;
}

export interface BreakpointConfig {
	/** Unique name of the breakpoint */
	readonly name: string;
	/** Base URL of frames for this breakpoint */
	url: string;
	/** Minimum window width for this breakpoint (inclusive) */
	breakpointMin?: number;
	/** Maximum window width for this breakpoint (inclusive) */
	breakpointMax?: number;
	/** Preloaded frames */
	frames: (HTMLImageElement | null)[];
	/** Optional fallback frame URL */
	fallbackFrameUrl?: string | null;
	/** Optional fallback frame */
	fallbackFrame?: HTMLImageElement | null;
	/** First frame number for this breakpoint */
	frameFirstId?: number;
	/** Last frame number for this breakpoint */
	frameLastId?: number;
	/** Prefix for frame filenames */
	framePrefix?: string;
	/** Suffix for frame filenames (like .jpg) */
	frameSuffix?: string;
	/** Number of digits to pad frame numbers */
	frameDigits: number;
}

export type BreakpointsConfigs = BreakpointConfig[];

export interface FrameLoaderProps {
	activeBreakpoint: BreakpointConfig;
	firstFrame: number;
	lastFrame: number;
	preloadCount: number;
	networkPolicy?: NetworkPolicy;
}

export interface ScrollEngineProps {
	containerRef: HTMLElement;
	totalFrames: number;
	onFrameChange: (frameIndex: number) => void;
	scrub?: boolean;
	start?: string;
	end?: string;
	markers?: boolean;
	loadingMode?: string;
	lazyLoadAroundFrame?: (frameIndex: number) => void;
}
