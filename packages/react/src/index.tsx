'use client';
import { useEffect, useRef, useMemo } from 'react';
import { ApfelSequenceEngine } from '@apfel-sequence/core';
import type { ApfelSequenceProps } from '@apfel-sequence/core';

export type ApfelSequenceReactProps = Omit<ApfelSequenceProps, 'canvas' | 'container'> & {
	fallbackSrc?: string;
	className?: string;
};

const ApfelSequence = (props: ApfelSequenceReactProps) => {
	const {
		assetsConfig,
		drawMode,
		networkPolicy,
		scrollConfig,
		loadingConfig,
		clearCacheOnBreakpointChange,
		alt,
		fallbackSrc,
		className
	} = props;
	const containerRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const engineRef = useRef<ApfelSequenceEngine | null>(null);

	// Stabilize object props by value so that inline object literals passed by the
	// parent (e.g. scrollConfig={{ start: 'top top' }}) don't create new references
	// on every render and trigger a needless updateConfig call.
	const stableScrollConfig = useMemo(
		() => scrollConfig,
		// Deps are the primitive values inside scrollConfig, not the object reference.
		// This prevents spurious updateConfig calls when inline objects are passed as props.
		[scrollConfig?.start, scrollConfig?.end, scrollConfig?.scrub, scrollConfig?.markers]
	);

	const stableLoadingConfig = useMemo(
		() => loadingConfig,
		// Deps are the primitive values inside loadingConfig, not the object reference.
		[
			loadingConfig?.loadingMode,
			loadingConfig?.trigger,
			loadingConfig?.start,
			loadingConfig?.preloadCount,
			loadingConfig?.maxRetries,
			loadingConfig?.retryDelay,
			loadingConfig?.maxConcurrency,
			loadingConfig?.markers
		]
	);

	useEffect(() => {
		if (!canvasRef.current) {
			console.warn(`ApfelSequenceReact: selector did not return an HTMLCanvasElement`);
			return;
		}

		if (!containerRef.current) {
			console.warn(`ApfelSequenceReact: selector did not return an HTMLElement`);
			return;
		}

		engineRef.current = new ApfelSequenceEngine({
			assetsConfig,
			drawMode,
			networkPolicy,
			scrollConfig: stableScrollConfig,
			loadingConfig: stableLoadingConfig,
			clearCacheOnBreakpointChange,
			alt,
			canvas: canvasRef.current,
			container: containerRef.current
		});

		return () => {
			engineRef.current?.destroy();
			engineRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (engineRef.current) {
			engineRef.current.updateConfig({
				assetsConfig,
				drawMode,
				networkPolicy,
				scrollConfig: stableScrollConfig,
				loadingConfig: stableLoadingConfig,
				clearCacheOnBreakpointChange,
				alt
			});
		}
	}, [
		assetsConfig,
		drawMode,
		networkPolicy,
		stableScrollConfig,
		stableLoadingConfig,
		clearCacheOnBreakpointChange,
		alt
	]);

	return (
		<div className={`apfel-container ${className || ''}`.trim()} ref={containerRef}>
			<canvas className="apfel-sequence" ref={canvasRef} aria-label={alt} role="img" />
			{fallbackSrc && (
				<noscript>
					<img
						src={fallbackSrc}
						alt={alt}
						style={{
							width: '100%',
							height: '100%',
							objectFit: drawMode === 'contain' ? 'contain' : 'cover'
						}}
					/>
				</noscript>
			)}
		</div>
	);
};

export default ApfelSequence;
