import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FrameLoader } from "./frame-loader";
import type { BreakpointConfig } from "../types/apfelSequence";
import { Emitter } from "../utils/emitter/emitter";

const mockScrollScrubInstances: any[] = [];
vi.mock("../scroll-engine/scroll-trigger", () => ({
	ScrollScrub: vi.fn().mockImplementation(function (this: any, props: any) {
		this.init = vi.fn();
		this.destroy = vi.fn();
		this._props = props;
		mockScrollScrubInstances.push(this);
	}),
}));


describe("FrameLoader", () => {
	let mockBreakpoint: BreakpointConfig;
	let frameLoader: FrameLoader;

	beforeEach(() => {
		mockBreakpoint = {
			name: "test-breakpoint",
			url: "/test",
			frames: new Array(10).fill(null),
			frameDigits: 4,
			frameFirstId: 1,
			frameLastId: 10,
			frameSuffix: ".jpg",
			framePrefix: "frame_",
		};

		// Mock <img /> constructor default behavior (success)
		globalThis.Image = class {
			src = "";
			onload: (() => void) | null = null;
			onerror: ((err: unknown) => void) | null = null;
			complete = false;
			decode = vi.fn().mockResolvedValue(undefined);

			constructor() {
				setTimeout(() => {
					this.complete = true;
					if (this.onload) this.onload();
				}, 10);
			}
		} as any;

		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe("Sequential Loading Mode", () => {
		beforeEach(() => {
			frameLoader = new FrameLoader({
				emitter: new Emitter(),
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
			});
		});

		it("should load frames sequentially one at a time", async () => {
			const loadPromise1 = frameLoader.loadFrame(1, "sequential");
			const loadPromise2 = frameLoader.loadFrame(2, "sequential");
			const loadPromise3 = frameLoader.loadFrame(3, "sequential");

			// First frame should start loading immediately
			expect(mockBreakpoint.frames[0]).toBeNull();

			// Advance timers to complete first frame
			await vi.advanceTimersByTimeAsync(15);
			await loadPromise1;

			// First frame should be loaded
			expect(mockBreakpoint.frames[0]).not.toBeNull();
			expect(mockBreakpoint.frames[0]?.status).toBe("success");

			// Second frame should now start
			await vi.advanceTimersByTimeAsync(15);
			await loadPromise2;

			expect(mockBreakpoint.frames[1]).not.toBeNull();
			expect(mockBreakpoint.frames[1]?.status).toBe("success");

			// Third frame
			await vi.advanceTimersByTimeAsync(15);
			await loadPromise3;

			expect(mockBreakpoint.frames[2]).not.toBeNull();
			expect(mockBreakpoint.frames[2]?.status).toBe("success");
		});

		it("should queue frames and process them in order", async () => {
			const loadOrder: number[] = [];
			const onFrameLoaded = vi.fn((frame) => {
				loadOrder.push(frame.frameNumber);
			});

			frameLoader = new FrameLoader({
				emitter: new Emitter(),
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
			});
			frameLoader['emitter'].subscribe('frameLoaded', onFrameLoaded);

			// multiple frames => queued
			const promises = [
				frameLoader.loadFrame(5, "sequential"),
				frameLoader.loadFrame(3, "sequential"),
				frameLoader.loadFrame(8, "sequential"),
			];

			await vi.advanceTimersByTimeAsync(100);
			await Promise.all(promises);

			// order they were queued
			expect(loadOrder).toEqual([5, 3, 8]);
		});

		it("should not load the same frame twice in sequential mode", async () => {
			const onFrameLoaded = vi.fn();

			frameLoader = new FrameLoader({
				emitter: new Emitter(),
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
			});
			frameLoader['emitter'].subscribe('frameLoaded', onFrameLoaded);

			// same frame twice
			const promise1 = frameLoader.loadFrame(1, "sequential");
			await vi.advanceTimersByTimeAsync(15);
			await promise1;

			const promise2 = frameLoader.loadFrame(1, "sequential");
			await vi.advanceTimersByTimeAsync(15);
			await promise2;

			// Should only call onFrameLoaded once
			expect(onFrameLoaded).toHaveBeenCalledTimes(1);
		});
	});

	describe("Parallel Loading Mode", () => {
		beforeEach(() => {
			frameLoader = new FrameLoader({
				emitter: new Emitter(),
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
			});
		});

		it("should load frames in parallel simultaneously", async () => {
			const loadPromises = [
				frameLoader.loadFrame(1, "parallel"),
				frameLoader.loadFrame(2, "parallel"),
				frameLoader.loadFrame(3, "parallel"),
			];

			//same time
			await vi.advanceTimersByTimeAsync(15);
			await Promise.all(loadPromises);

			expect(mockBreakpoint.frames[0]?.status).toBe("success");
			expect(mockBreakpoint.frames[1]?.status).toBe("success");
			expect(mockBreakpoint.frames[2]?.status).toBe("success");
		});

		it("should load multiple frames faster than sequential", async () => {
			const startTime = performance.now();

			const parallelPromises = [
				frameLoader.loadFrame(1, "parallel"),
				frameLoader.loadFrame(2, "parallel"),
				frameLoader.loadFrame(3, "parallel"),
			];

			await vi.advanceTimersByTimeAsync(15);
			await Promise.all(parallelPromises);

			const parallelTime = performance.now() - startTime;

			// Reset
			mockBreakpoint.frames = new Array(10).fill(null);
			const sequentialLoader = new FrameLoader({
				emitter: new Emitter(),
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
			});

			const sequentialStart = performance.now();

			// Sequential loading
			await sequentialLoader.loadFrame(1, "sequential");
			await vi.advanceTimersByTimeAsync(15);
			await sequentialLoader.loadFrame(2, "sequential");
			await vi.advanceTimersByTimeAsync(15);
			await sequentialLoader.loadFrame(3, "sequential");
			await vi.advanceTimersByTimeAsync(15);

			const sequentialTime = performance.now() - sequentialStart;

			// Parallel should be faster (or at least not slower)
			expect(parallelTime).toBeLessThanOrEqual(sequentialTime);
		});

		it("should not load the same frame twice in parallel mode", async () => {
			const onFrameLoaded = vi.fn();

			frameLoader = new FrameLoader({
				emitter: new Emitter(),
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
			});
			frameLoader['emitter'].subscribe('frameLoaded', onFrameLoaded);

			// same frame parallel
			const promises = [
				frameLoader.loadFrame(1, "parallel"),
				frameLoader.loadFrame(1, "parallel"),
			];

			await vi.advanceTimersByTimeAsync(15);
			await Promise.all(promises);

			// Should only call onFrameLoaded once
			expect(onFrameLoaded).toHaveBeenCalledTimes(1);
		});
	});


	describe("Mixed Sequential and Parallel Loading", () => {
		it("should handle mixed sequential and parallel requests correctly", async () => {
			const onFrameLoaded = vi.fn();

			frameLoader = new FrameLoader({
				emitter: new Emitter(),
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
			});
			frameLoader['emitter'].subscribe('frameLoaded', onFrameLoaded);

			// Mix of sequential and parallel
			const promises = [
				frameLoader.loadFrame(1, "sequential"),
				frameLoader.loadFrame(2, "parallel"),
				frameLoader.loadFrame(3, "sequential"),
				frameLoader.loadFrame(4, "parallel"),
			];

			await vi.advanceTimersByTimeAsync(50);
			await Promise.all(promises);

			expect(mockBreakpoint.frames[0]).not.toBeNull();
			expect(mockBreakpoint.frames[1]).not.toBeNull();
			expect(mockBreakpoint.frames[2]).not.toBeNull();
			expect(mockBreakpoint.frames[3]).not.toBeNull();

			expect(mockBreakpoint.frames[0]?.status).toBe("success");
			expect(mockBreakpoint.frames[1]?.status).toBe("success");
			expect(mockBreakpoint.frames[2]?.status).toBe("success");
			expect(mockBreakpoint.frames[3]?.status).toBe("success");
		});
	});

	describe("Performance Tracking", () => {
		it("should track loading duration for each frame", async () => {
			const onFrameLoaded = vi.fn();

			vi.useRealTimers();

			frameLoader = new FrameLoader({
				emitter: new Emitter(),
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
			});
			frameLoader['emitter'].subscribe('frameLoaded', onFrameLoaded);

			await frameLoader.loadFrame(1, "parallel");

			expect(onFrameLoaded).toHaveBeenCalledWith(
				expect.objectContaining({
					frameNumber: 1,
					startTime: expect.any(Number),
					endTime: expect.any(Number),
					duration: expect.any(Number),
					status: "success",
				})
			);

			const call = onFrameLoaded.mock.calls[0][0];
			expect(call.duration).toBeGreaterThanOrEqual(0);
			expect(call.endTime).toBeGreaterThanOrEqual(call.startTime);
			
			vi.useFakeTimers();
		});
	});

	describe("Retry Logic", () => {
		it("should retry failed frames up to maxRetries", async () => {
			const onFrameLoaded = vi.fn();
			let attempts = 0;

			// Override Image to fail
			globalThis.Image = class {
				src = "";
				onload: any = null;
				onerror: any = null;
				complete = false;
				decode = vi.fn();
				constructor() {
					attempts++;
					setTimeout(() => {
						if (this.onerror) this.onerror(new Error("Network Error"));
					}, 10);
				}
			} as any;

			frameLoader = new FrameLoader({
				emitter: new Emitter(),
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 100,
			});
			frameLoader['emitter'].subscribe('frameFailed', onFrameLoaded);

			const loadPromise = frameLoader.loadFrame(1, "parallel");

			// 1st attempt
			await vi.advanceTimersByTimeAsync(20); 
			// Wait for retry delay
			await vi.advanceTimersByTimeAsync(100);
			// 2nd attempt
			await vi.advanceTimersByTimeAsync(20);
			// Wait for retry delay
			await vi.advanceTimersByTimeAsync(100);
			// 3rd attempt
			await vi.advanceTimersByTimeAsync(20);

			await loadPromise;

			expect(attempts).toBe(3);
			expect(mockBreakpoint.frames[0]?.status).toBe("error");
			expect(onFrameLoaded).toHaveBeenCalledWith(expect.objectContaining({ status: "error", attempts: 3 }));
		});

		it("should succeed if retry succeeds", async () => {
			const onFrameLoaded = vi.fn();
			let attempts = 0;

			// Fail first time, succeed second
			globalThis.Image = class {
				src = "";
				onload: any = null;
				onerror: any = null;
				complete = false;
				// decode intentionally undefined
				constructor() {
					attempts++;
					setTimeout(() => {
						// Fail on 1st attempt
						if (attempts === 1) {
							if (this.onerror) this.onerror(new Error("Fail"));
						} else {
							// Succeed on 2nd
							this.complete = true;
							if (this.onload) this.onload();
						}
					}, 5);
				}
			} as any;

			frameLoader = new FrameLoader({
				emitter: new Emitter(),
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 10,
			});
			frameLoader['emitter'].subscribe('frameLoaded', onFrameLoaded);

			const loadPromise = frameLoader.loadFrame(1, "parallel");

			// 1st attempt (fail)
			await vi.advanceTimersByTimeAsync(10);
			// Retry delay
			await vi.advanceTimersByTimeAsync(20);
			// 2nd attempt (success)
			await vi.advanceTimersByTimeAsync(10);

			await loadPromise;

			expect(attempts).toBeGreaterThanOrEqual(2);
			expect(mockBreakpoint.frames[0]?.status).toBe("success");
			expect(mockBreakpoint.frames[0]?.attempts).toBeGreaterThanOrEqual(2);
		});
	});

	describe("Lazy Loading", () => {
		it("should init ScrollScrub and load neighbors on update", async () => {
			const { ScrollScrub } = await import("../scroll-engine/scroll-trigger");
			// Clear any instances from previous tests
			mockScrollScrubInstances.length = 0;

			frameLoader = new FrameLoader({
				emitter: new Emitter(),
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 0,
				maxRetries: 1,
				retryDelay: 0,
			});

			const loadFrameSpy = vi.spyOn(frameLoader, 'loadFrame');

			// Create a fake trigger element
			const triggerEl = document.createElement("div");
			frameLoader.initLazyLoading(triggerEl);

			// ScrollScrub should have been instantiated
			expect(ScrollScrub).toHaveBeenCalled();
			expect(mockScrollScrubInstances.length).toBeGreaterThan(0);

			// Get the instance and simulate a scroll update at 50%
			const instance = mockScrollScrubInstances[mockScrollScrubInstances.length - 1];
			instance._props.onUpdate({ progress: 0.5 });

			// Should trigger loadFrame for neighbors
			expect(loadFrameSpy).toHaveBeenCalled();
		});
	});

	describe("Preloading", () => {
		it("should preload the specified number of frames", async () => {
			frameLoader = new FrameLoader({
				emitter: new Emitter(),
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 3, 
				maxRetries: 1,
				retryDelay: 0,
			});

			const spy = vi.spyOn(frameLoader, 'loadFrame');

			await frameLoader.preloadInitialFrames();

			expect(spy).toHaveBeenCalledTimes(3);
			expect(spy).toHaveBeenCalledWith(1);
			expect(spy).toHaveBeenCalledWith(2);
			expect(spy).toHaveBeenCalledWith(3);
		});
	});
});
