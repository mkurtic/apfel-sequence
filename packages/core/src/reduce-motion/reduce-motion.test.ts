import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrefersReducedMotion } from './reduce-motion';
import { Emitter } from '../utils/emitter/emitter';
import type { ApfelSequenceEvents } from '../types/apfelSequence';

describe('PrefersReducedMotion', () => {
	let matchMediaMock: any;
	let addEventListenerMock: any;
	let removeEventListenerMock: any;
	let matches = false;
	let changeHandler: ((e: any) => void) | null = null;

	beforeEach(() => {
		matches = false;
		changeHandler = null;

		addEventListenerMock = vi.fn((event, handler) => {
			if (event === 'change') {
				changeHandler = handler;
			}
		});

		removeEventListenerMock = vi.fn();

		matchMediaMock = vi.fn().mockImplementation((query) => {
			return {
				matches,
				addEventListener: addEventListenerMock,
				removeEventListener: removeEventListenerMock,
				media: query,
				onchange: null,
				addListener: vi.fn(), // deprecated but often present
				removeListener: vi.fn(), // deprecated but often present
				dispatchEvent: vi.fn()
			};
		});

		vi.stubGlobal('window', {
			matchMedia: matchMediaMock
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should initialize with false if matchMedia returns false', () => {
		matches = false;
		const motion = new PrefersReducedMotion(new Emitter<ApfelSequenceEvents>());
		expect(motion.value).toBe(false);
	});

	it('should initialize with true if matchMedia returns true', () => {
		matches = true;
		const motion = new PrefersReducedMotion(new Emitter<ApfelSequenceEvents>());
		expect(motion.value).toBe(true);
	});

	it('should set up listener on init', () => {
		new PrefersReducedMotion(new Emitter<ApfelSequenceEvents>());
		expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
		expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
	});

	it('should call onChange when media query changes', () => {
		const emitter = new Emitter<ApfelSequenceEvents>();
		const emitSpy = vi.spyOn(emitter, 'emit');
		new PrefersReducedMotion(emitter);

		if (changeHandler) {
			changeHandler({ matches: true } as MediaQueryListEvent);
		}

		expect(emitSpy).toHaveBeenCalledWith('motionPreferenceChanged', true);
	});

	it('should remove listener on destroy', () => {
		const motion = new PrefersReducedMotion(new Emitter<ApfelSequenceEvents>());
		motion.destroy();
		expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
	});

	it('should handle SSR, no window', () => {
		vi.stubGlobal('window', undefined);
		const motion = new PrefersReducedMotion(new Emitter<ApfelSequenceEvents>());
		expect(motion.value).toBe(false);
		// Should not crash
	});
});
