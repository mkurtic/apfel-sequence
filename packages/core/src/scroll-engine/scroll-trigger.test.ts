import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseOffset, ScrollScrub } from './scroll-trigger';

describe('scroll-trigger', () => {
	describe('parseOffset', () => {
		const elementSize = 1000;
		const viewportSize = 800;

		it('calculates "top top"', () => {
			expect(parseOffset('top top', elementSize, viewportSize)).toBe(0);
		});

		it('calculates "top bottom" (trigger hits bottom of viewport)', () => {
			expect(parseOffset('top bottom', elementSize, viewportSize)).toBe(-800);
		});

		it('calculates "bottom top"', () => {
			expect(parseOffset('bottom top', elementSize, viewportSize)).toBe(1000);
		});

		it('calculates "bottom bottom"', () => {
			expect(parseOffset('bottom bottom', elementSize, viewportSize)).toBe(200);
		});

		it('calculates "center center"', () => {
			expect(parseOffset('center center', elementSize, viewportSize)).toBe(100);
		});

		it('calculates percentage values', () => {
			expect(parseOffset('50% 100%', elementSize, viewportSize)).toBe(-300); // 500 - 800
			expect(parseOffset('0% 0%', elementSize, viewportSize)).toBe(0);
		});

		it('calculates pixel values', () => {
			expect(parseOffset('200px 100px', elementSize, viewportSize)).toBe(100);
		});

		it('handles mixed values', () => {
			expect(parseOffset('top 50%', elementSize, viewportSize)).toBe(-400);
			expect(parseOffset('center 200px', elementSize, viewportSize)).toBe(300); // 500 - 200
		});
	});

	describe('ScrollScrub class', () => {
		let triggerEl: HTMLElement;

		beforeEach(() => {
			triggerEl = document.createElement('div');
			Object.defineProperty(triggerEl, 'getBoundingClientRect', {
				value: () => ({ top: 500, height: 1000 })
			});

			vi.stubGlobal('innerHeight', 800);
			vi.stubGlobal('scrollY', 0);

			class MockIntersectionObserver {
				observe() {}
				unobserve() {}
				disconnect() {}
			}
			vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('initializes and calculates correct scroll boundaries for "top top" to "bottom top"', () => {
			let reportedProgress = -1;
			const scrub = new ScrollScrub({
				trigger: triggerEl,
				start: 'top top',
				end: 'bottom top',
				onUpdate: ({ progress }) => {
					reportedProgress = progress;
				}
			});

			scrub.init();

			// start: elementTop(500) + top(0) - viewport(0) = 500
			// end: elementTop(500) + bottom(1000) - viewport(0) = 1500
			// animationLength = 1000

			// Before scroll threshold
			vi.stubGlobal('scrollY', 0);
			scrub.update();
			expect(reportedProgress).toBe(0);

			// Halfway
			vi.stubGlobal('scrollY', 1000); // 500 into the 1000 length
			scrub.update();
			expect(reportedProgress).toBe(0.5);

			// Past end
			vi.stubGlobal('scrollY', 2000);
			scrub.update();
			expect(reportedProgress).toBe(1);
		});

		it('triggers lifecycle events correctly', () => {
			const onEnter = vi.fn();
			const onLeave = vi.fn();
			const onEnterBack = vi.fn();
			const onLeaveBack = vi.fn();

			const scrub = new ScrollScrub({
				trigger: triggerEl,
				start: 'top top', // start: 500
				end: 'bottom top', // end: 1500
				onUpdate: () => {},
				onEnter,
				onLeave,
				onEnterBack,
				onLeaveBack
			});

			scrub.init();

			// Initially before trigger
			vi.stubGlobal('scrollY', 0);
			scrub.update();

			// Scroll forward past start
			vi.stubGlobal('scrollY', 600);
			scrub.update();
			expect(onEnter).toHaveBeenCalledTimes(1);
			expect(onLeave).not.toHaveBeenCalled();

			// Scroll forward past end
			vi.stubGlobal('scrollY', 1600);
			scrub.update();
			expect(onLeave).toHaveBeenCalledTimes(1);

			// Scroll backwards past end
			vi.stubGlobal('scrollY', 1400);
			scrub.update();
			expect(onEnterBack).toHaveBeenCalledTimes(1);

			// Scroll backwards past start
			vi.stubGlobal('scrollY', 0);
			scrub.update();
			expect(onLeaveBack).toHaveBeenCalledTimes(1);
		});
	});
});
