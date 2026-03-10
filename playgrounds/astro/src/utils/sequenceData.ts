import type { AssetsConfig, LoadingConfig, ScrollConfig, DrawMode } from "@apfel-sequence/core";

export const commonDrawMode: DrawMode = "cover";

export const heroAssets: AssetsConfig = [
	{
		name: "desktop",
		url: "/images/sequences/mountains/desktop/mountains_",
		frameFirstId: 1,
		frameLastId: 100,
		frameSuffix: ".webp",
		breakpointMin: 1025,
		breakpointMax: 3000,
	},
	{
		name: "tablet",
		url: "/images/sequences/mountains/tablet/mountains_",
		frameFirstId: 1,
		frameLastId: 100,
		frameSuffix: ".webp",
		breakpointMin: 641,
		breakpointMax: 1024,
	},
	{
		name: "mobile",
		url: "/images/sequences/mountains/mobile/mountains_",
		frameFirstId: 1,
		frameLastId: 100,
		frameSuffix: ".webp",
		breakpointMin: 0,
		breakpointMax: 640,
	},
];

export const heroLoadingConfig: LoadingConfig = {
	loadingMode: "eager",
};

export const section2Assets: AssetsConfig = [
	{
		name: "desktop",
		url: "/images/sequences/snow/desktop/snow_",
		frameFirstId: 1,
		frameLastId: 242,
		frameSuffix: ".webp",
		breakpointMin: 1025,
		breakpointMax: 3000,
	},
	{
		name: "tablet",
		url: "/images/sequences/snow/tablet/snow_",
		frameFirstId: 1,
		frameLastId: 242,
		frameSuffix: ".webp",
		breakpointMin: 641,
		breakpointMax: 1024,
	},
	{
		name: "mobile",
		url: "/images/sequences/snow/mobile/snow_",
		frameFirstId: 1,
		frameLastId: 242,
		frameSuffix: ".webp",
		breakpointMin: 0,
		breakpointMax: 640,
	},
];

export const section2LoadingConfig: LoadingConfig = {
	trigger: "#section-2",
	start: "top top",
	markers: false,
};

export const section2ScrollConfig: ScrollConfig = {
	start: "top top",
	end: "100%",
};
