import type { BreakpointConfig } from "../types/scrollSequence";

type BreakpointListener<T> = (active: T) => void;

export class ActiveBreakpoint<T extends BreakpointConfig> {
	private breakpoints: T[];
	private active: T;
	private listeners = new Set<BreakpointListener<T>>();
	private resizeHandler: () => void;

	constructor(breakpoints: T[]) {
		if (breakpoints.length === 0) {
			throw new Error("ActiveBreakpoint requires at least one breakpoint");
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
				throw new Error(`Breakpoints overlap: ${current.name} ends at ${current.breakpointMax} and ${next.name} starts at ${next.breakpointMin}`);
			}
		}
	}

	private debounce(func: Function, wait: number) {
		let timeout: any;
		return (...args: any[]) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), wait);
		};
	}

	init() {
		this.update();
		if (typeof window !== "undefined") {
			window.addEventListener("resize", this.resizeHandler);
		}
	}

	destroy() {
		if (typeof window !== "undefined") {
			window.removeEventListener("resize", this.resizeHandler);
		}
		this.listeners.clear();
	}

	getActive(): T {
		return this.active;
	}

	subscribe(listener: BreakpointListener<T>) {
		this.listeners.add(listener);
		listener(this.active);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private update() {
		if (typeof window === "undefined") return;
		const width = window.innerWidth;

		const next = this.breakpoints.find((bp) => {
			const min = bp.breakpointMin ?? 0;
			const max = bp.breakpointMax ?? Infinity;
			return width >= min && width <= max;
		});

		if (!next) {
			throw new Error(`No breakpoint found for width ${width}, please fix your breakpoints.`);
		}

		if (next !== this.active) {
			this.active = next;
			this.listeners.forEach((l) => l(this.active));
		}
	}
}
