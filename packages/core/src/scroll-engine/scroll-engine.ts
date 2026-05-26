import type { ScrollEngineProps } from '../types/apfelSequence';
import { ScrollScrub } from './scroll-trigger';

export class ScrollEngine {
	private scrub: ScrollScrub | null = null;
	private lastFrame: number = -1;
	private props: ScrollEngineProps;

	constructor(props: ScrollEngineProps) {
		this.props = props;
		this.init();
	}

	public init(): void {
		const {
			containerRef,
			triggerRef,
			totalFrames,
			onFrameChange,
			start = 'top top',
			end = 'bottom top',
			scrub = true
		} = this.props;

		const element = triggerRef || containerRef;
		if (!element) return;

		this.destroy();

		this.scrub = new ScrollScrub({
			trigger: element,
			start,
			end,
			scrub,
			onUpdate: ({ progress }) => {
				const frameIndex = Math.floor(progress * (totalFrames - 1));
				if (frameIndex !== this.lastFrame) {
					this.lastFrame = frameIndex;
					onFrameChange(frameIndex);
				}
				if (this.props.lazyLoadAroundFrame) {
					this.props.lazyLoadAroundFrame(frameIndex);
				}
			}
		});

		this.scrub.init();
	}

	public destroy(): void {
		if (this.scrub) {
			this.scrub.destroy();
			this.scrub = null;
		}
	}
}
