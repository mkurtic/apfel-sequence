import type { DrawMode, RenderableImage, ApfelEmitter } from '../types/apfelSequence';
import { scaleToCover } from '../utils/canvas/scaleToCover';
import { scaleToContain } from '../utils/canvas/scaleToContain';

class CanvasRender {
	private dpr: number;
	private drawMode: DrawMode | undefined;
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D | null;
	private container: HTMLElement;
	private lastDrawnFrame: RenderableImage | null = null;
	private lastDrawnFallback: RenderableImage | null = null;
	private canvasSize: { width: number; height: number } = { width: 0, height: 0 };
	private containerWidth: number = 0;
	private containerHeight: number = 0;
	private emitter: ApfelEmitter;
	constructor(config: {
		emitter: ApfelEmitter;
		canvas: HTMLCanvasElement;
		container: HTMLElement;
		dpr: number;
		drawMode: DrawMode | undefined;
	}) {
		this.emitter = config.emitter;
		this.dpr = config.dpr;
		this.drawMode = config.drawMode;
		this.canvas = config.canvas;
		this.ctx = config.canvas.getContext('2d');
		this.container = config.container;

		this.updateContainerSize();
		this.applySmoothing();

		this.emitter.subscribe(
			'drawFrame',
			(frame: RenderableImage | null, fallback: RenderableImage | null | undefined) => {
				this.drawFrame(frame, fallback);
			}
		);
	}

	private applySmoothing() {
		if (!this.ctx) return;
		this.ctx.imageSmoothingEnabled = true;
		this.ctx.imageSmoothingQuality = 'high';
	}

	setDrawMode(drawMode: DrawMode | undefined) {
		this.drawMode = drawMode;
		if (this.lastDrawnFrame) {
			this.drawFrame(this.lastDrawnFrame, this.lastDrawnFallback);
		} else if (this.lastDrawnFallback) {
			this.drawFrame(null, this.lastDrawnFallback);
		}
	}

	private renderImage(
		image: RenderableImage,
		canvas: HTMLCanvasElement,
		ctx: CanvasRenderingContext2D
	) {
		if (this.drawMode === 'cover') {
			scaleToCover(image, canvas, ctx);
		} else {
			scaleToContain(image, canvas, ctx);
		}
	}

	drawFrame = (frame: RenderableImage | null, fallback: RenderableImage | null | undefined) => {
		const canvas = this.canvas;
		const ctx = this.ctx;
		const container = this.container;
		if (!canvas || !ctx || !container) return;

		const dpr = this.dpr;
		const width = this.containerWidth * dpr;
		const height = this.containerHeight * dpr;

		if (this.canvasSize.width !== width || this.canvasSize.height !== height) {
			canvas.width = width;
			canvas.height = height;
			this.canvasSize = { width, height };
			this.applySmoothing();
		}

		ctx.setTransform(1, 0, 0, 1, 0, 0);

		if (fallback !== undefined) {
			this.lastDrawnFallback = fallback;
		}

		//only fallback BEFORE first real frame
		if (frame) {
			this.lastDrawnFrame = frame;
			this.renderImage(frame, canvas, ctx);
			return;
		}

		if (!this.lastDrawnFrame && this.lastDrawnFallback) {
			this.renderImage(this.lastDrawnFallback, canvas, ctx);
			return;
		}

		// If no new frame, keep the old one
		if (this.lastDrawnFrame) {
			this.renderImage(this.lastDrawnFrame, canvas, ctx);
		}
	};

	private updateContainerSize() {
		this.containerWidth = this.container.clientWidth;
		this.containerHeight = this.container.clientHeight;
	}

	resizeCanvas = () => {
		this.updateContainerSize();
		this.drawFrame(null, undefined);
	};
}

export { CanvasRender };
