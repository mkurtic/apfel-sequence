import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	test: {
		environment: 'jsdom',
		setupFiles: [resolve(__dirname, 'src/test-setup.ts')]
	}
});
