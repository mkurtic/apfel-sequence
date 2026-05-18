// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vue from '@astrojs/vue';
import path from 'path';

export default defineConfig({
	integrations: [react(), vue()],
	vite: {
		resolve: {
			alias: {
				// In Development: Alias to source code for Hot Module Replacement (HMR)
				...(process.env.NODE_ENV === 'development'
					? {
							'@apfel-sequence/core': path.resolve('../../packages/core/src/index.ts'),
							'apfel-sequence': path.resolve('../../packages/vanilla/src/index.ts'),
							'@apfel-sequence/react': path.resolve('../../packages/react/src/index.tsx'),
							'@apfel-sequence/vue': path.resolve('../../packages/vue/src/index.ts')
					  }
					: {
							'@apfel-sequence/core': path.resolve('../../packages/core/dist/index.mjs'),
							'apfel-sequence': path.resolve('../../packages/vanilla/dist/apfel-sequence.es.js'),
							'@apfel-sequence/react': path.resolve(
								'../../packages/react/dist/apfel-sequence-react.es.js'
							),
							'@apfel-sequence/vue': path.resolve(
								'../../packages/vue/dist/apfel-sequence-vue.es.js'
							)
					  })
			}
		}
	}
});
