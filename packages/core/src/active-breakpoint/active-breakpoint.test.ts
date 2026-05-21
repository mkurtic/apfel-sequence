import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActiveBreakpoint } from './active-breakpoint';
import { Emitter } from '../utils/emitter/emitter';
import type { ApfelSequenceEvents } from '../types/apfelSequence';
import type { BreakpointConfig } from '../types/apfelSequence';

describe('ActiveBreakpoint', () => {
	const breakpoints: BreakpointConfig[] = [
		{
			name: 'mobile',
			breakpointMin: 0,
			breakpointMax: 767,
			frames: [],
			frameDigits: 4,
			url: ''
		},
		{
			name: 'tablet',
			breakpointMin: 768,
			breakpointMax: 1024,
			frames: [],
			frameDigits: 4,
			url: ''
		},
		{
			name: 'desktop',
			breakpointMin: 1025,
			breakpointMax: Infinity,
			frames: [],
			frameDigits: 4,
			url: ''
		}
	];

	beforeEach(() => {
		vi.stubGlobal('innerWidth', 1000);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should throw error if breakpoints array is empty', () => {
		expect(() => new ActiveBreakpoint([], new Emitter<ApfelSequenceEvents>())).toThrow(
			'ActiveBreakpoint requires at least one breakpoint'
		);
	});

	it('should throw error if breakpoints overlap', () => {
		const overlappingBreakpoints: BreakpointConfig[] = [
			{ name: 'small', breakpointMin: 0, breakpointMax: 600, frames: [], frameDigits: 4, url: '' },
			{
				name: 'large',
				breakpointMin: 500,
				breakpointMax: 1000,
				frames: [],
				frameDigits: 4,
				url: ''
			}
		];
		expect(
			() => new ActiveBreakpoint(overlappingBreakpoints, new Emitter<ApfelSequenceEvents>())
		).toThrow('Breakpoints overlap');
	});

	it('should initialize with the correct breakpoint based on window width', () => {
		vi.stubGlobal('innerWidth', 500);
		const manager = new ActiveBreakpoint(breakpoints, new Emitter<ApfelSequenceEvents>());
		manager.init();
		expect(manager.getActive().name).toBe('mobile');

		vi.stubGlobal('innerWidth', 800);
		const manager2 = new ActiveBreakpoint(breakpoints, new Emitter<ApfelSequenceEvents>());
		manager2.init();
		expect(manager2.getActive().name).toBe('tablet');

		vi.stubGlobal('innerWidth', 1200);
		const manager3 = new ActiveBreakpoint(breakpoints, new Emitter<ApfelSequenceEvents>());
		manager3.init();
		expect(manager3.getActive().name).toBe('desktop');
	});

	it('should throw error if no breakpoint matches (gap)', () => {
		// This case might be tricky depending on how overlaps/gaps are handled,
		const gapBreakpoints: BreakpointConfig[] = [
			{ name: 'small', breakpointMin: 0, breakpointMax: 500, frames: [], frameDigits: 4, url: '' },
			{
				name: 'large',
				breakpointMin: 600,
				breakpointMax: 1000,
				frames: [],
				frameDigits: 4,
				url: ''
			}
		];

		vi.stubGlobal('innerWidth', 550); // In the gap
		const manager = new ActiveBreakpoint(gapBreakpoints, new Emitter<ApfelSequenceEvents>());
		// Should throw error
		expect(() => manager.init()).toThrow('No breakpoint found for width 550');
	});

	it('should update active breakpoint on window resize', () => {
		vi.useFakeTimers();
		vi.stubGlobal('innerWidth', 500);
		const manager = new ActiveBreakpoint(breakpoints, new Emitter<ApfelSequenceEvents>());
		manager.init();
		expect(manager.getActive().name).toBe('mobile');

		// Resize to tablet
		vi.stubGlobal('innerWidth', 800);
		window.dispatchEvent(new Event('resize'));

		vi.advanceTimersByTime(150);

		expect(manager.getActive().name).toBe('tablet');
		vi.useRealTimers();
	});

	it('should notify subscribers when breakpoint changes', () => {
		vi.useFakeTimers();
		vi.stubGlobal('innerWidth', 500);
		const emitter = new Emitter<ApfelSequenceEvents>();
		const emitSpy = vi.spyOn(emitter, 'emit');
		const manager = new ActiveBreakpoint(breakpoints, emitter);
		manager.init();

		expect(emitSpy).toHaveBeenCalledWith(
			'breakpointChanged',
			expect.objectContaining({ name: 'mobile' })
		);

		// Resize to tablet
		vi.stubGlobal('innerWidth', 800);
		window.dispatchEvent(new Event('resize'));

		vi.advanceTimersByTime(150);

		expect(emitSpy).toHaveBeenCalledWith(
			'breakpointChanged',
			expect.objectContaining({ name: 'tablet' })
		);
		vi.useRealTimers();
	});

	it('should debounce resize events', () => {
		vi.useFakeTimers();
		vi.stubGlobal('innerWidth', 500);
		const emitter = new Emitter<ApfelSequenceEvents>();
		const emitSpy = vi.spyOn(emitter, 'emit');
		const manager = new ActiveBreakpoint(breakpoints, emitter);
		manager.init();

		// Initial emit
		expect(emitSpy).toHaveBeenCalledTimes(1);
		emitSpy.mockClear();

		// Resize multiple times quickly
		vi.stubGlobal('innerWidth', 800);
		window.dispatchEvent(new Event('resize'));
		vi.stubGlobal('innerWidth', 801);
		window.dispatchEvent(new Event('resize'));
		vi.stubGlobal('innerWidth', 802);
		window.dispatchEvent(new Event('resize'));

		// Should not have triggered update yet
		expect(emitSpy).not.toHaveBeenCalled();

		// Fast forward time
		vi.advanceTimersByTime(200); // Assuming 200ms debounce or similar

		// Now it should have updated once
		expect(emitSpy).toHaveBeenCalledTimes(1);
		expect(emitSpy).toHaveBeenCalledWith('breakpointChanged', expect.anything());

		vi.useRealTimers();
	});

	it("should NOT notify subscribers if resize doesn't change active breakpoint", () => {
		vi.useFakeTimers();
		vi.stubGlobal('innerWidth', 500);
		const emitter = new Emitter<ApfelSequenceEvents>();
		const emitSpy = vi.spyOn(emitter, 'emit');
		const manager = new ActiveBreakpoint(breakpoints, emitter);
		manager.init();

		// Initial emit
		expect(emitSpy).toHaveBeenCalledTimes(1);
		emitSpy.mockClear();

		// Resize to mobile
		vi.stubGlobal('innerWidth', 600);
		window.dispatchEvent(new Event('resize'));

		vi.advanceTimersByTime(150);

		expect(emitSpy).not.toHaveBeenCalled();
		vi.useRealTimers();
	});

	it('should clean up listeners on destroy', () => {
		const manager = new ActiveBreakpoint(breakpoints, new Emitter<ApfelSequenceEvents>());
		manager.init();

		const removeSpy = vi.spyOn(window, 'removeEventListener');
		manager.destroy();

		expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
	});
});
