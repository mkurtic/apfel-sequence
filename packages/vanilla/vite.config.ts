import { defineConfig } from "vite";
import path from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
	root: __dirname,
	plugins: [
		dts({
			entryRoot: path.resolve(__dirname, "src"),
			outDir: path.resolve(__dirname, "dist"),
			insertTypesEntry: true,
		}),
	],
	build: {
		lib: {
			entry: path.resolve(__dirname, "src/index.ts"),
			name: "ScrollSequence",
			formats: ["es", "cjs"],
			fileName: (format) => (format === "es" ? "scroll-sequence.es.js" : "scroll-sequence.cjs"),
		},
		rollupOptions: {
			external: ["@scroll-sequence/core"],
		},
	},
});
