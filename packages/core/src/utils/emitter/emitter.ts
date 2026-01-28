export class Emitter {
	private events: { [key: string]: Function[] } = {};

	subscribe(name: string, cb: Function) {
		if (!this.events[name]) {
			this.events[name] = [];
		}
		this.events[name].push(cb);
	}

	unsubscribe(name: string, cb: Function) {
		if (this.events[name]) {
			this.events[name] = this.events[name].filter((fn) => fn !== cb);
		}
	}

	emit(name: string, ...args: any[]) {
		if (this.events[name]) {
			this.events[name].forEach((cb) => cb(...args));
		}
	}

	destroy() {
		this.events = {};
	}
}
