import type { RenderableImage } from '../../types/apfelSequence';

export const scaleToContain = (
	img: RenderableImage,
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	dpr: number
) => {
	if (!img || !canvas || !ctx) return;

	const cw = canvas.width;
	const ch = canvas.height;

	const scale = Math.min(cw / img.width, ch / img.height);

	const x = cw / 2 - (img.width * scale) / 2;

	const cssYOffset = 0;
	const yOffset = cssYOffset * (dpr || 1);

	const y = ch / 2 - (img.height * scale) / 2 + yOffset;

	ctx.clearRect(0, 0, cw, ch);
	ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
};
