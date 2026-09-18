import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
export default {
	// Svelte 4 の store 記法を使わない（CLAUDE.md「Svelte 5 runes を使う」）
	compilerOptions: { runes: true },
	kit: {
		adapter: adapter()
	}
};
