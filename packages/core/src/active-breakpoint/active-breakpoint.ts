import type { BreakpointConfig, ApfelEmitter } from '../types/apfelSequence';

export class ActiveBreakpoint<T extends BreakpointConfig> {
	private breakpoints: T[];
	private active: T;
	private resizeHandler: () => void;
	private emitter: ApfelEmitter;

	constructor(breakpoints: T[], emitter: ApfelEmitter) {
		this.emitter = emitter;
		if (breakpoints.length === 0) {
			throw new Error('ActiveBreakpoint requires at least one breakpoint');
		}

		this.breakpoints = breakpoints.sort((a, b) => (a.breakpointMin ?? 0) - (b.breakpointMin ?? 0));
		this.validateBreakpoints();
		this.active = breakpoints[0];

		this.resizeHandler = this.debounce(this.update.bind(this), 100);
	}

	private validateBreakpoints() {
		for (let i = 0; i < this.breakpoints.length - 1; i++) {
			const current = this.breakpoints[i];
			const next = this.breakpoints[i + 1];
			// Check if current max overlaps with next min
			if ((current.breakpointMax ?? Infinity) >= (next.breakpointMin ?? 0)) {
				throw new Error(
					`Breakpoints overlap: ${current.name} ends at ${current.breakpointMax} and ${next.name} starts at ${next.breakpointMin}`
				);
			}
		}
	}

	private debounce<F extends (...args: any[]) => any>(func: F, wait: number) {
		let timeout: ReturnType<typeof setTimeout>;
		return (...args: Parameters<F>) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), wait);
		};
	}

	private getBreakpointForWidth(width: number): T {
		const next = this.breakpoints.find((bp) => {
			const min = bp.breakpointMin ?? 0;
			const max = bp.breakpointMax ?? Infinity;
			return width >= min && width <= max;
		});

		if (!next) {
			throw new Error(`No breakpoint found for width ${width}, please fix your breakpoints.`);
		}

		return next;
	}

	init() {
		if (typeof window !== 'undefined') {
			window.addEventListener('resize', this.resizeHandler);
			this.active = this.getBreakpointForWidth(window.innerWidth);
		}
		this.emitter.emit('breakpointChanged', this.active);
	}

	destroy() {
		if (typeof window == 'undefined') return;
		window.removeEventListener('resize', this.resizeHandler);
	}

	getActive(): T {
		return this.active;
	}

	private update() {
		if (typeof window === 'undefined') return;

		const next = this.getBreakpointForWidth(window.innerWidth);

		if (next !== this.active) {
			this.active = next;
			this.emitter.emit('breakpointChanged', this.active);
		}
	}
}
