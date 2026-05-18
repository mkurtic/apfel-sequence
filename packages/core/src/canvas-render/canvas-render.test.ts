import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CanvasRender } from './canvas-render';
import { Emitter } from '../utils/emitter/emitter';
import * as scaleToCoverModule from '../utils/canvas/scaleToCover';
import * as scaleToContainModule from '../utils/canvas/scaleToContain';

vi.mock('../utils/canvas/scaleToCover', () => ({
	scaleToCover: vi.fn()
}));

vi.mock('../utils/canvas/scaleToContain', () => ({
	scaleToContain: vi.fn()
}));

describe('CanvasRender', () => {
	let canvas: HTMLCanvasElement;
	let container: HTMLElement;
	let ctx: CanvasRenderingContext2D;
	let dpr: number;

	beforeEach(() => {
		dpr = 2;
		canvas = document.createElement('canvas');
		container = document.createElement('div');

		Object.defineProperty(container, 'clientWidth', { configurable: true, value: 500 });
		Object.defineProperty(container, 'clientHeight', { configurable: true, value: 300 });

		ctx = {
			imageSmoothingEnabled: true,
			imageSmoothingQuality: 'high',
			setTransform: vi.fn(),
			clearRect: vi.fn(),
			drawImage: vi.fn()
		} as unknown as CanvasRenderingContext2D;

		vi.spyOn(canvas, 'getContext').mockReturnValue(ctx);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should initialize with provided configuration', () => {
		const render = new CanvasRender({
			emitter: new Emitter(),
			canvas,
			container,
			dpr,
			drawMode: 'cover'
		});
		expect(render).toBeTruthy();
	});

	it('should resize canvas based on container and DPR on first draw', () => {
		const render = new CanvasRender({
			emitter: new Emitter(),
			canvas,
			container,
			dpr,
			drawMode: 'cover'
		});

		const frame = document.createElement('img');
		render.drawFrame(frame, null);

		// width = 500 * 2 = 1000
		expect(canvas.width).toBe(1000);
		expect(canvas.height).toBe(600);
	});

	it("should use scaleToCover when drawMode is 'cover'", () => {
		const render = new CanvasRender({
			emitter: new Emitter(),
			canvas,
			container,
			dpr,
			drawMode: 'cover'
		});
		const frame = document.createElement('img');
		render.drawFrame(frame, null);

		expect(scaleToCoverModule.scaleToCover).toHaveBeenCalledWith(frame, canvas, ctx, dpr);
		expect(scaleToContainModule.scaleToContain).not.toHaveBeenCalled();
	});

	it("should use scaleToContain when drawMode is 'contain' or undefined", () => {
		const render = new CanvasRender({
			emitter: new Emitter(),
			canvas,
			container,
			dpr,
			drawMode: 'contain'
		});
		const frame = document.createElement('img');
		render.drawFrame(frame, null);

		expect(scaleToContainModule.scaleToContain).toHaveBeenCalledWith(frame, canvas, ctx, dpr);
		expect(scaleToCoverModule.scaleToCover).not.toHaveBeenCalled();
	});

	it('should update canvas size if container size changes', () => {
		const render = new CanvasRender({
			emitter: new Emitter(),
			canvas,
			container,
			dpr,
			drawMode: 'cover'
		});
		const frame = document.createElement('img');

		// First draw
		render.drawFrame(frame, null);
		expect(canvas.width).toBe(1000);

		// Change container size
		Object.defineProperty(container, 'clientWidth', { configurable: true, value: 800 });

		// Second draw
		render.drawFrame(frame, null);
		expect(canvas.width).toBe(1600); // 800 * 2
	});

	it('should store lastDrawnFrame and use it if no new frame is provided', () => {
		const render = new CanvasRender({
			emitter: new Emitter(),
			canvas,
			container,
			dpr,
			drawMode: 'cover'
		});
		const frame1 = document.createElement('img');
		frame1.src = 'frame1.jpg';

		// Draw frame1
		render.drawFrame(frame1, null);
		expect(scaleToCoverModule.scaleToCover).toHaveBeenCalledWith(
			frame1,
			expect.anything(),
			expect.anything(),
			expect.anything()
		);

		vi.clearAllMocks();

		// Draw null, should use lastDrawnFrame -> frame1
		render.drawFrame(null, null);
		expect(scaleToCoverModule.scaleToCover).toHaveBeenCalledWith(
			frame1,
			expect.anything(),
			expect.anything(),
			expect.anything()
		);
	});

	it('should use fallback if no frame and no lastDrawnFrame', () => {
		const render = new CanvasRender({
			emitter: new Emitter(),
			canvas,
			container,
			dpr,
			drawMode: 'cover'
		});
		const fallback = document.createElement('img');
		fallback.src = 'fallback.jpg';

		render.drawFrame(null, fallback);
		expect(scaleToCoverModule.scaleToCover).toHaveBeenCalledWith(
			fallback,
			expect.anything(),
			expect.anything(),
			expect.anything()
		);
	});

	it('should not draw anything if no inputs provided', () => {
		const render = new CanvasRender({
			emitter: new Emitter(),
			canvas,
			container,
			dpr,
			drawMode: 'cover'
		});

		render.drawFrame(null, null);
		expect(scaleToCoverModule.scaleToCover).not.toHaveBeenCalled();
		expect(scaleToContainModule.scaleToContain).not.toHaveBeenCalled();
	});
});
