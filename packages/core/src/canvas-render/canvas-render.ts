import type { DrawMode } from "../types/apfelSequence";
import { scaleToCover } from "../utils/canvas/scaleToCover";
import { scaleToContain } from "../utils/canvas/scaleToContain";
import type { Emitter } from "../utils/emitter/emitter";

class CanvasRender {
	private dpr: number;
	private drawMode: DrawMode | undefined;
	private canvas: HTMLCanvasElement;
	private container: HTMLElement;
	private lastDrawnFrame: HTMLImageElement | null = null;
	private canvasSize: { width: number; height: number } = { width: 0, height: 0 };
	private emitter: Emitter;
	constructor(config: {emitter: Emitter, canvas: HTMLCanvasElement; container: HTMLElement; dpr: number; drawMode: DrawMode | undefined }) {
		this.emitter = config.emitter;
		this.dpr = config.dpr;
		this.drawMode = config.drawMode;
		this.canvas = config.canvas;
		this.container = config.container;

		this.emitter.subscribe("drawFrame", (frame: HTMLImageElement | null, fallback: HTMLImageElement | null | undefined) => {
			this.drawFrame(frame, fallback);
		});
	}

	private renderImage(image: HTMLImageElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
		if (this.drawMode === "cover") {
			scaleToCover(image, canvas, ctx, this.dpr);
		} else {
			scaleToContain(image, canvas, ctx, this.dpr);
		}
	}

	drawFrame = (frame: HTMLImageElement | null, fallback: HTMLImageElement | null | undefined) => {
		const canvas = this.canvas;
		const ctx = canvas?.getContext("2d");
		const container = this.container;
		if (!canvas || !ctx || !container) return;

		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";

		const dpr = this.dpr;
		const width = container.clientWidth * dpr;
		const height = container.clientHeight * dpr;

		if (this.canvasSize.width !== width || this.canvasSize.height !== height) {
			canvas.width = width;
			canvas.height = height;
			this.canvasSize = { width, height };
		}

		ctx.setTransform(1, 0, 0, 1, 0, 0);

		//only fallback BEFORE first real frame
		if (frame) {
			this.lastDrawnFrame = frame;
			this.renderImage(frame, canvas, ctx);
			return;
		}

		if (!this.lastDrawnFrame && fallback) {
			this.renderImage(fallback, canvas, ctx);
			return;
		}

		// If no new frame, keep the old one
		if (this.lastDrawnFrame) {
			this.renderImage(this.lastDrawnFrame, canvas, ctx);
		}
	};

	resizeCanvas = () => this.drawFrame(null, null);
}

export { CanvasRender };
