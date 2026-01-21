export const heroAssets = [
	{
		name: "desktop",
		url: "/images/sequences/1/desktop/A_",
		frameFirstId: 1,
		frameLastId: 235,
		frameSuffix: " Medium.jpeg",
		breakpointMin: 681,
		breakpointMax: 3000,
	},
	{
		name: "mobile",
		url: "/images/sequences/1/mobile/A_",
		frameFirstId: 1,
		frameLastId: 234,
		frameSuffix: " Large.jpeg",
		breakpointMin: 0,
		breakpointMax: 680,
	},
];

export const heroLoadingConfig = {
	loadingMode: "eager",
};

export const section2Assets = [
	{
		name: "largeImages",
		url: "/images/sequences/2/B_",
		frameFirstId: 1,
		frameLastId: 140,
		frameSuffix: " Large.jpeg",
		frameFallback: "/images/2/B_0001.jpeg",
	},
];

export const section2LoadingConfig = {
	trigger: "#hero",
	triggerStart: "top top",
	triggerMarkers: false,
};

export const section2ScrollConfig = {
	scrollTriggerStart: "top top",
	scrollTriggerEnd: "100%",
};
