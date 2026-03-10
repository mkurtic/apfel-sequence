import { useEffect, useRef } from "react";
import { ApfelSequenceEngine } from "@apfel-sequence/core";
import type { ApfelSequenceProps } from "@apfel-sequence/core";

export type ApfelSequenceReactProps = Omit<ApfelSequenceProps, "canvas" | "container">;

const ApfelSequence = (props: ApfelSequenceReactProps) => {
	const { assetsConfig, drawMode, networkPolicy, scrollConfig, loadingConfig, alt } = props;
	const containerRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);


	useEffect(() => {
		if (!canvasRef.current) {
			console.warn(`ApfelSequenceReact: selector did not return an HTMLCanvasElement`);
			return;
		}

		if (!containerRef.current) {
			console.warn(`ApfelSequenceReact: selector did not return an HTMLElement`);
			return;
		}

		const engine = new ApfelSequenceEngine({
			assetsConfig: assetsConfig,
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
	}, [assetsConfig, drawMode, networkPolicy, scrollConfig, loadingConfig]);

	return (
		<div className="apfel-container" ref={containerRef}>
			<canvas className="apfel-sequence" ref={canvasRef} aria-label={alt} role="img"/>
			{/*Fallback only img tag*/}
		</div>
	);
};

export default ApfelSequence;
