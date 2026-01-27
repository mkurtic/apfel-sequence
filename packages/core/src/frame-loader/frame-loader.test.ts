import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FrameLoader } from "./frame-loader";
import type { BreakpointConfig } from "../types/scrollSequence";

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

		// Mock <img /> constructor
		global.Image = class {
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
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
				onFrameLoaded,
			});

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
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
				onFrameLoaded,
			});

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
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
				onFrameLoaded,
			});

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

	// TODO: Add retry logic tests, dont understand how to test this properly

	describe("Mixed Sequential and Parallel Loading", () => {
		it("should handle mixed sequential and parallel requests correctly", async () => {
			const onFrameLoaded = vi.fn();

			frameLoader = new FrameLoader({
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
				onFrameLoaded,
			});

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
				activeBreakpoint: mockBreakpoint,
				firstFrame: 1,
				lastFrame: 10,
				preloadCount: 5,
				maxRetries: 3,
				retryDelay: 200,
				onFrameLoaded,
			});

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
});
