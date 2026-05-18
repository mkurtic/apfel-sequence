import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

Object.defineProperty(window, 'scrollY', {
	writable: true,
	configurable: true,
	value: 0
});

Object.defineProperty(window, 'scrollX', {
	writable: true,
	configurable: true,
	value: 0
});

Object.defineProperty(window, 'innerHeight', {
	writable: true,
	configurable: true,
	value: 1024
});

Object.defineProperty(window, 'innerWidth', {
	writable: true,
	configurable: true,
	value: 1920
});

Object.defineProperty(window, 'pageYOffset', {
	writable: true,
	configurable: true,
	value: 0
});

Object.defineProperty(window, 'pageXOffset', {
	writable: true,
	configurable: true,
	value: 0
});

// Mock requestAnimationFrame
globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
	setTimeout(cb, 16);
	return 0;
});

globalThis.cancelAnimationFrame = vi.fn();
