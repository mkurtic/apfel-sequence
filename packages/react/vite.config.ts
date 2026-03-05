import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
	root: __dirname,
	plugins: [
		react(),
		dts({
			entryRoot: path.resolve(__dirname, "src"),
			outDir: path.resolve(__dirname, "dist"),
			insertTypesEntry: true,
		}),
	],
	build: {
		lib: {
			entry: path.resolve(__dirname, "src/index.tsx"),
			name: "ApfelSequenceReact",
			formats: ["es", "cjs"],
			fileName: (format) => (format === "es" ? "apfel-sequence-react.es.js" : "apfel-sequence-react.cjs"),
		},
		rollupOptions: {
			external: ["react", "react-dom", "@apfel-sequence/core"],
		},
	},
});
