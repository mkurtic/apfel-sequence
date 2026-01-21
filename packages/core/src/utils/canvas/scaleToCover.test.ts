import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { scaleToContain } from "./scaleToContain";
import { scaleToCover } from "./scaleToCover";

describe("scaleToContain / scaleToCover", () => {
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let img: HTMLImageElement;

	beforeEach(() => {
		vi.clearAllMocks();
		canvas = document.createElement("canvas");
		canvas.width = 800;
		canvas.height = 600;

		ctx = {
			clearRect: vi.fn(),
			drawImage: vi.fn(),
		} as unknown as CanvasRenderingContext2D;

		vi.spyOn(canvas, "getContext").mockReturnValue(ctx);

		img = document.createElement("img");
		img.width = 400;
		img.height = 300;
	});

	it("scaleToContain should scale image to fit inside canvas", () => {
		scaleToContain(img, canvas, ctx, 1);

		const expectedScale = Math.min(canvas.width / img.width, canvas.height / img.height);
		const expectedX = canvas.width / 2 - (img.width * expectedScale) / 2;
		const expectedY = canvas.height / 2 - (img.height * expectedScale) / 2;

		const drawArgs = (ctx.drawImage as Mock).mock.calls[0];

		expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
		expect(drawArgs[0]).toBe(img);
		expect(drawArgs[1]).toBeCloseTo(expectedX, 2);
		expect(drawArgs[2]).toBeCloseTo(expectedY, 2);
		expect(drawArgs[3]).toBeCloseTo(img.width * expectedScale, 2);
		expect(drawArgs[4]).toBeCloseTo(img.height * expectedScale, 2);
	});

	it("scaleToCover should scale image to cover entire canvas", () => {
		scaleToCover(img, canvas, ctx, 1);

		const expectedScale = Math.max(canvas.width / img.width, canvas.height / img.height);
		const expectedX = canvas.width / 2 - (img.width * expectedScale) / 2;
		const expectedY = canvas.height / 2 - (img.height * expectedScale) / 2;

		const drawArgs = (ctx.drawImage as Mock).mock.calls[0];

		expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
		expect(drawArgs[0]).toBe(img);
		expect(drawArgs[1]).toBeCloseTo(expectedX, 2);
		expect(drawArgs[2]).toBeCloseTo(expectedY, 2);
		expect(drawArgs[3]).toBeCloseTo(img.width * expectedScale, 2);
		expect(drawArgs[4]).toBeCloseTo(img.height * expectedScale, 2);
	});

	it("should do nothing if img, canvas or ctx is missing", () => {
		expect(() => scaleToContain(null as any, canvas, ctx, 1)).not.toThrow();
		expect(() => scaleToCover(img, null as any, ctx, 1)).not.toThrow();
		expect(() => scaleToCover(img, canvas, null as any, 1)).not.toThrow();
	});
});
