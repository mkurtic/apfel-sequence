import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import type { ScrollEngineProps } from "../types/scrollSequence";

gsap.registerPlugin(ScrollTrigger);

export class ScrollEngine {
	private tl: gsap.core.Timeline | null = null;
	private lastFrame: number = -1;
	private props: ScrollEngineProps;

	constructor(props: ScrollEngineProps) {
		this.props = props;
		this.init();
	}

	public init(): void {
		const { containerRef, totalFrames, onFrameChange, start = "top top", end = "100%", scrub = true, markers = false } = this.props;

		const element = containerRef;
		if (!element) return;

		// Clean up
		this.destroy();

		this.tl = gsap.timeline({
			scrollTrigger: {
				trigger: element,
				start,
				end,
				scrub,
				markers,
				onUpdate: (self) => {
					const frameIndex = Math.floor(self.progress * (totalFrames - 1));
					if (frameIndex !== this.lastFrame) {
						this.lastFrame = frameIndex;
						onFrameChange(frameIndex);
					}
				},
			},
		});
	}

	public destroy(): void {
		if (this.tl) {
			this.tl.kill();
			this.tl = null;
		}

		if (this.props.containerRef) {
			ScrollTrigger.getAll().forEach((t) => {
				if (t.vars.trigger === this.props.containerRef) {
					t.kill();
				}
			});
		}
	}
}
