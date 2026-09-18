import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],

	// ファイルを書き込む権限を持つため、外部から到達できる状態にしない（SPEC.md §4.5）。
	// ポートを固定するのは、取られていたら黙って別ポートへ逃げるのを防ぐため
	server: { host: '127.0.0.1', port: 5173, strictPort: true },

	// domain/ と persistence/ は純粋 TS なので、ブラウザ環境を用意しない
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
