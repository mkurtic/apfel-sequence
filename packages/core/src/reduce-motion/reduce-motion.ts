export class PrefersReducedMotion {
	private mediaQuery: MediaQueryList | null = null;
	private listener?: (event: MediaQueryListEvent) => void;

	constructor(private onChange?: (value: boolean) => void) {
		if (typeof window === "undefined") return;

		this.mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

		this.listener = (event) => {
			this.onChange?.(event.matches);
		};

		this.mediaQuery.addEventListener("change", this.listener);
	}

	get value(): boolean {
		return this.mediaQuery?.matches ?? false;
	}

	destroy() {
		if (this.mediaQuery && this.listener) {
			this.mediaQuery.removeEventListener("change", this.listener);
		}
	}
}
