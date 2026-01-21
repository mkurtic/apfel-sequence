import type { FrameUrlConfig } from "../../types/utils";

export const getFrameHref = (cfg: FrameUrlConfig, frameNumber: number): string => {
	const padded = String(frameNumber).padStart(cfg.frameDigits, "0");
	return cfg.url + (cfg.framePrefix ?? "") + padded + (cfg.frameSuffix ?? "");
};
