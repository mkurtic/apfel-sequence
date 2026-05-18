import type { RenderableImage } from '../../types/apfelSequence';

export const scaleToCover = (
	img: RenderableImage,
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	dpr: number
) => {
	if (!img || !canvas || !ctx) return;

	const cw = canvas.width;
	const ch = canvas.height;

	const scale = Math.max(cw / img.width, ch / img.height);

	const x = cw / 2 - (img.width * scale) / 2;

	const y = ch / 2 - (img.height * scale) / 2;

	ctx.clearRect(0, 0, cw, ch);
	ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
};
