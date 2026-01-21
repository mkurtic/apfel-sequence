import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import path from "path";

export default defineConfig({
	root: __dirname,
	plugins: [
		vue(),
		dts({
			entryRoot: path.resolve(__dirname, "src"),
			outDir: path.resolve(__dirname, "dist"),
			insertTypesEntry: true,
		}),
	],
	build: {
		lib: {
			entry: path.resolve(__dirname, "src/index.ts"),
			name: "ScrollSequenceVue",
			formats: ["es", "cjs"],
			fileName: (format) => (format === "es" ? "scroll-sequence-vue.es.js" : "scroll-sequence-vue.cjs.js"),
		},
		rollupOptions: {
			external: ["vue", "@scroll-sequence/core"],
		},
	},
});
