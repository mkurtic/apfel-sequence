type TickCallback = () => void;

class Ticker {
	private callbacks: Set<TickCallback> = new Set();
	private activeCallbacks: Set<TickCallback> = new Set();
	private rafId: number | null = null;

	register(cb: TickCallback): void {
		this.callbacks.add(cb);
	}

	unregister(cb: TickCallback): void {
		this.callbacks.delete(cb);
		this.activeCallbacks.delete(cb);
		if (this.activeCallbacks.size === 0) {
			this.stop();
		}
	}

	activate(cb: TickCallback): void {
		if (!this.callbacks.has(cb)) return;
		this.activeCallbacks.add(cb);
		this.start();
	}

	deactivate(cb: TickCallback): void {
		this.activeCallbacks.delete(cb);
		if (this.activeCallbacks.size === 0) {
			this.stop();
		}
	}

	private start(): void {
		if (this.rafId !== null) return; // Already running
		const loop = () => {
			this.activeCallbacks.forEach((cb) => cb());
			this.rafId = requestAnimationFrame(loop);
		};
		this.rafId = requestAnimationFrame(loop);
	}

	private stop(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}
}

export const scrollScrubTicker = new Ticker();
