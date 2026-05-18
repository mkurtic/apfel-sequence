import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
	root: __dirname,
	plugins: [
		vue(),
		dts({
			entryRoot: path.resolve(__dirname, 'src'),
			outDir: path.resolve(__dirname, 'dist'),
			insertTypesEntry: true
		})
	],
	build: {
		lib: {
			entry: path.resolve(__dirname, 'src/index.ts'),
			name: 'ApfelSequenceVue',
			formats: ['es', 'cjs'],
			fileName: (format) =>
				format === 'es' ? 'apfel-sequence-vue.es.js' : 'apfel-sequence-vue.cjs'
		},
		rollupOptions: {
			external: ['vue', '@apfel-sequence/core']
		}
	}
});
