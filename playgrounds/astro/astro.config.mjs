// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vue from "@astrojs/vue";
import path from "path";

export default defineConfig({
	integrations: [react(), vue()],
	vite: {
		resolve: {
			alias: {
				// In Development: Alias to source code for Hot Module Replacement (HMR)
				...(process.env.NODE_ENV === "development"
					? {
							"@scroll-sequence/core": path.resolve("../../packages/core/src/index.ts"),
							"scroll-sequence": path.resolve("../../packages/vanilla/src/index.ts"),
							"@scroll-sequence/react": path.resolve("../../packages/react/src/index.tsx"),
							"@scroll-sequence/vue": path.resolve("../../packages/vue/src/index.ts"),
					  }
					: {
							// In Production: Alias to built dist files (simulating NPM package usage)
							"@scroll-sequence/core": path.resolve("../../packages/core/dist/index.esm.js"),
							"scroll-sequence": path.resolve("../../packages/vanilla/dist/scroll-sequence.es.js"),
							"@scroll-sequence/react": path.resolve("../../packages/react/dist/scroll-sequence-react.es.js"),
							"@scroll-sequence/vue": path.resolve("../../packages/vue/dist/scroll-sequence-vue.es.js"),
					  }),
			},
		},
	},
});
