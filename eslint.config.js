import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

/**
 * 層の境界（CLAUDE.md「ドメインロジックはフレームワークから切り離す」）。
 *
 *   domain/      ← persistence/ ← server/
 *
 * 依存は一方向。domain/ と persistence/ はブラウザにもサーバーにも依存しない
 * 純粋 TS でなければならず、Vitest からブラウザなしで叩けること。
 */
const FRAMEWORK_AND_RUNTIME = {
	group: ['svelte', 'svelte/*', '$app', '$app/*', 'node:*', 'fs', 'path', 'url'],
	message:
		'domain/ と persistence/ は純粋 TS に保つ。Svelte・SvelteKit・Node の API に依存させない。'
};

const layerBoundaries = [
	{
		files: ['src/lib/domain/**/*.ts'],
		ignores: ['**/*.test.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/persistence/**', '**/server/**', '**/state/**', '**/client/**'],
							message:
								'domain/ はドメインの規則だけを持つ。ファイル形式・I/O・UI の都合を持ち込まない。'
						},
						FRAMEWORK_AND_RUNTIME
					]
				}
			]
		}
	},
	{
		files: ['src/lib/persistence/**/*.ts'],
		ignores: ['**/*.test.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/server/**', '**/state/**', '**/client/**'],
							message: 'persistence/ はファイル形式の知識だけを持つ。I/O は server/ の責務。'
						},
						FRAMEWORK_AND_RUNTIME
					]
				}
			]
		}
	}
];

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: { projectService: true, extraFileExtensions: ['.svelte'], svelteConfig }
		}
	},
	...layerBoundaries,
	{ ignores: ['build/', '.svelte-kit/', 'node_modules/'] }
);
