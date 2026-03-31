"use client"
import { useEffect, useRef } from "react";
import { ApfelSequenceEngine } from "@apfel-sequence/core";
import type { ApfelSequenceProps } from "@apfel-sequence/core";

export type ApfelSequenceReactProps = Omit<ApfelSequenceProps, "canvas" | "container">;

const ApfelSequence = (props: ApfelSequenceReactProps) => {
	const { assetsConfig, drawMode, networkPolicy, scrollConfig, loadingConfig, alt } = props;
	const containerRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const engineRef = useRef<ApfelSequenceEngine | null>(null);

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
			scrollConfig,
			loadingConfig,
			alt,
			canvas: canvasRef.current,
			container: containerRef.current,
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
				scrollConfig,
				loadingConfig,
				alt,
			});
		}
	}, [assetsConfig, drawMode, networkPolicy, scrollConfig, loadingConfig, alt]);

	return (
		<div className="apfel-container" ref={containerRef}>
			<canvas className="apfel-sequence" ref={canvasRef} aria-label={alt} role="img"/>
			{/*Fallback only img tag*/}
		</div>
	);
};

export default ApfelSequence;
