import type { Emitter } from '../utils/emitter/emitter';

export class PrefersReducedMotion {
	private mediaQuery: MediaQueryList | null = null;
	private listener?: (event: MediaQueryListEvent) => void;
	private emitter: Emitter;

	constructor(emitter: Emitter) {
		this.emitter = emitter;
		if (typeof window === 'undefined') return;

		this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

		this.listener = (event) => {
			this.emitter.emit('motionPreferenceChanged', event.matches);
		};

		this.mediaQuery.addEventListener('change', this.listener);
	}

	init() {
		if (this.mediaQuery) {
			this.emitter.emit('motionPreferenceChanged', this.mediaQuery.matches);
		}
	}

	get value(): boolean {
		return this.mediaQuery?.matches ?? false;
	}

	destroy() {
		if (this.mediaQuery && this.listener) {
			this.mediaQuery.removeEventListener('change', this.listener);
		}
	}
}
