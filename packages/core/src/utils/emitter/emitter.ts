type Listener<Args extends unknown[]> = (...args: Args) => void;

export class Emitter<T extends Record<string, unknown[]>> {
	private events: { [K in keyof T]?: Listener<T[K]>[] } = {};

	subscribe<K extends keyof T>(name: K, cb: Listener<T[K]>): void {
		const list = this.events[name];
		if (!list) {
			this.events[name] = [cb];
		} else {
			list.push(cb);
		}
	}

	unsubscribe<K extends keyof T>(name: K, cb: Listener<T[K]>): void {
		const list = this.events[name];
		if (list) {
			this.events[name] = list.filter((fn) => fn !== cb);
		}
	}

	emit<K extends keyof T>(name: K, ...args: T[K]): void {
		const list = this.events[name];
		if (list) {
			list.forEach((cb) => cb(...args));
		}
	}

	destroy(): void {
		this.events = {};
	}
}
