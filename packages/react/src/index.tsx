import { useEffect, useMemo, useRef } from "react";
import { ScrollSequenceEngine } from "@scroll-sequence/core";
import type { ScrollSequenceProps } from "@scroll-sequence/core";

const ScrollSequence = ({ assetsConfigs, drawMode, networkPolicy, scrollConfig, loadingConfig, alt }: ScrollSequenceProps) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);


	useEffect(() => {
		if (!canvasRef.current) {
			console.warn(`ScrollSequenceReact: selector did not return an HTMLCanvasElement`);
			return;
		}

		if (!containerRef.current) {
			console.warn(`ScrollSequenceReact: selector did not return an HTMLElement`);
			return;
		}

		const engine = new ScrollSequenceEngine({
			assetsConfigs: assetsConfigs,
			drawMode,
			networkPolicy,
			scrollConfig,
			loadingConfig,
			alt,
			canvas: canvasRef.current,
			container: containerRef.current,
		});

		return () => {
			engine.destroy();
		};
	}, [assetsConfigs, drawMode, networkPolicy, scrollConfig, loadingConfig]);

	return (
		<div className="scroll-sequence container" ref={containerRef}>
			<canvas className="scroll-sequence" ref={canvasRef} aria-label={alt} role="img"/>
			{/*Fallback only img tag*/}
		</div>
	);
};

export default ScrollSequence;
