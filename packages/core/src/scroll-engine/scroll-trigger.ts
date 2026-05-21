import { scrollScrubTicker } from './scroll-scrub-ticker';

export type ScrollScrubCallback = {
	progress: number;
};

export type OffsetKeyword = 'top' | 'center' | 'bottom';
export type OffsetToken = OffsetKeyword | `${number}%` | `${number}px`;
export type ScrollOffset = `${OffsetToken} ${OffsetToken}` | (string & {});

export type ScrollScrubProps = {
	trigger: HTMLElement;
	start?: ScrollOffset;
	end?: ScrollOffset;
	scrub?: boolean;
	onUpdate: (self: ScrollScrubCallback) => void;
	onEnter?: () => void;
	onLeave?: () => void;
	onEnterBack?: () => void;
	onLeaveBack?: () => void;
};

function parseOffset(
	positionStr: string = 'top top',
	elementSize: number,
	viewportSize: number
): number {
	const [elementSide, viewportSide] = positionStr.trim().split(/\s+/);

	const resolveValue = (token: string = 'top', size: number): number => {
		if (token === 'top') return 0;
		if (token === 'center') return size / 2;
		if (token === 'bottom') return size;
		if (token.endsWith('%')) return (parseFloat(token) / 100) * size;
		if (token.endsWith('px')) return parseFloat(token);
		return 0;
	};

	return resolveValue(elementSide, elementSize) - resolveValue(viewportSide, viewportSize);
}

export class ScrollScrub {
	private props: ScrollScrubProps;
	private observer: IntersectionObserver | null = null;
	private lastProgress: number = -1;

	private scrollStart: number = 0;
	private scrollEnd: number = 0;
	private animationLength: number = 0;
	private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
	private isTouchDevice: boolean = false;

	private readonly tick: () => void;
	private readonly handleResize: () => void;

	constructor(props: ScrollScrubProps) {
		this.props = props;
		this.isTouchDevice =
			typeof window !== 'undefined' &&
			window.matchMedia('(hover: none) and (pointer: coarse)').matches;
		this.tick = this.update.bind(this); // Bind once so the same reference is used for register/unregister
		this.handleResize = () => {
			if (this.isTouchDevice) {
				if (this.resizeTimeout !== null) {
					clearTimeout(this.resizeTimeout);
				}
				this.resizeTimeout = setTimeout(() => {
					this.refresh();
				}, 150);
			} else {
				this.refresh();
			}
		};
	}

	init = (): void => {
		if (typeof window === 'undefined') return;

		this.refresh();
		window.addEventListener('resize', this.handleResize);

		scrollScrubTicker.register(this.tick);

		this.observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry.isIntersecting) {
					scrollScrubTicker.activate(this.tick);
				} else {
					this.update();
					scrollScrubTicker.deactivate(this.tick);
				}
			},
			{ rootMargin: '10px 0px 10px 0px' }
		);

		this.observer.observe(this.props.trigger);
	};

	refresh = (): void => {
		if (typeof window === 'undefined') return;

		const { trigger, start = 'top top', end = 'bottom top' } = this.props;

		const rect = trigger.getBoundingClientRect();
		const vh = window.innerHeight;
		const elementHeight = rect.height;
		const elementTop = rect.top + window.scrollY;

		const startOffset = parseOffset(start, elementHeight, vh);
		const endOffset = parseOffset(end, elementHeight, vh);

		this.scrollStart = elementTop + startOffset;
		this.scrollEnd = elementTop + endOffset;
		this.animationLength = this.scrollEnd - this.scrollStart;

		this.update();
	};

	update = (): void => {
		if (typeof window === 'undefined') return;

		const { onUpdate, onEnter, onLeave, onEnterBack, onLeaveBack } = this.props;

		if (this.animationLength <= 0) return;

		const rawProgress = (window.scrollY - this.scrollStart) / this.animationLength;
		const progress = Math.min(1, Math.max(0, rawProgress));

		if (rawProgress >= 0 && this.lastProgress < 0) onEnter?.();
		if (rawProgress >= 1 && this.lastProgress < 1) onLeave?.();
		if (rawProgress < 1 && this.lastProgress >= 1) onEnterBack?.();
		if (rawProgress < 0 && this.lastProgress >= 0) onLeaveBack?.();

		if (progress !== this.lastProgress) {
			this.lastProgress = progress;
			onUpdate({ progress });
		}
	};

	destroy = (): void => {
		scrollScrubTicker.unregister(this.tick);
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', this.handleResize);
		}
		if (this.resizeTimeout !== null) {
			clearTimeout(this.resizeTimeout);
		}
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	};
}
