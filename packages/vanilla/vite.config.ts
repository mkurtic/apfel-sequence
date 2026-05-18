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
			beforeWriteFile: (filePath, content) => ({
				filePath,
				content: content.replace(/\.\.\/\.\.\/core\/src/g, "@apfel-sequence/core"),
			}),
		}),
	],
	build: {
		lib: {
			entry: path.resolve(__dirname, "src/index.ts"),
			name: "ApfelSequence",
			formats: ["es", "cjs", "iife"],
			fileName: (format) => {
				if (format === "es") return "apfel-sequence.es.js";
				if (format === "cjs") return "apfel-sequence.cjs";
				return "apfel-sequence.min.js";
			},
		},
		rollupOptions: {
		},
	},
});
