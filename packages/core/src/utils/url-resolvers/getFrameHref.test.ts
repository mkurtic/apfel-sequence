import { describe, expect, it } from "vitest";
import { getFrameHref } from "./getFrameHref";
import type { FrameUrlConfig } from "../../types/utils";

describe("getFrameHref", () => {
	it("should return the correct frame href", () => {
		const cfg: FrameUrlConfig = {
			url: "https://example.com/",
			framePrefix: "frame-",
			frameSuffix: ".jpeg",
			frameDigits: 3,
		};
		const frameNumber = 12;
		const expected = "https://example.com/frame-012.jpeg";
		expect(getFrameHref(cfg, frameNumber)).toBe(expected);
	});

    it("should return the correct frame href", () => {
		const cfg: FrameUrlConfig = {
			url: "https://example.com/",
			framePrefix: "frame-",
			frameSuffix: ".webp",
			frameDigits: 4,
		};
		const frameNumber = 12;
		const expected = "https://example.com/frame-0012.webp";
		expect(getFrameHref(cfg, frameNumber)).toBe(expected);
	});
});


