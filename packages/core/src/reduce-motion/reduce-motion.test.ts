import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PrefersReducedMotion } from "./reduce-motion";

describe("PrefersReducedMotion", () => {
    let matchMediaMock: any;
    let addEventListenerMock: any;
    let removeEventListenerMock: any;
    let matches = false;
    let changeHandler: ((e: any) => void) | null = null;

    beforeEach(() => {
        matches = false;
        changeHandler = null;
        
        addEventListenerMock = vi.fn((event, handler) => {
            if (event === "change") {
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
                dispatchEvent: vi.fn(),
            };
        });

        vi.stubGlobal("window", {
            matchMedia: matchMediaMock,
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("should initialize with false if matchMedia returns false", () => {
        matches = false;
        const motion = new PrefersReducedMotion();
        expect(motion.value).toBe(false);
    });

    it("should initialize with true if matchMedia returns true", () => {
        matches = true;
        const motion = new PrefersReducedMotion();
        expect(motion.value).toBe(true);
    });

    it("should set up listener on init", () => {
        new PrefersReducedMotion();
        expect(matchMediaMock).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
        expect(addEventListenerMock).toHaveBeenCalledWith("change", expect.any(Function));
    });

    it("should call onChange when media query changes", () => {
        const onChange = vi.fn();
        new PrefersReducedMotion(onChange);

        if (changeHandler) {
            changeHandler({ matches: true } as MediaQueryListEvent);
        }

        expect(onChange).toHaveBeenCalledWith(true);
    });

    it("should remove listener on destroy", () => {
        const motion = new PrefersReducedMotion();
        motion.destroy();
        expect(removeEventListenerMock).toHaveBeenCalledWith("change", expect.any(Function));
    });

    it("should handle SSR, no window", () => {
        vi.stubGlobal("window", undefined);
        const motion = new PrefersReducedMotion();
        expect(motion.value).toBe(false);
        // Should not crash
    });
});
