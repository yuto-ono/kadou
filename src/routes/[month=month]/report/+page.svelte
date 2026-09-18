<script lang="ts">
	import { resolve } from '$app/paths';
	import { fetchMonth } from '$lib/client/api';
	import ReportSheet from '$lib/components/report/ReportSheet.svelte';
	import { buildReport, type ReportModel } from '$lib/domain/report';
	import '$lib/styles/print.css';
	import type { PageProps } from './$types';

	/** 報告書プレビュー（SPEC.md §6.2）。A4 縦のレイアウトでそのまま表示する */
	let { data }: PageProps = $props();

	let report = $state<ReportModel | null>(null);
	let error = $state<string | null>(null);

	$effect(() => {
		const month = data.month;
		let active = true;
		void fetchMonth(month)
			.then(({ data: monthData }) => active && (report = buildReport(monthData)))
			.catch((e: unknown) => active && (error = e instanceof Error ? e.message : String(e)));
		return () => {
			active = false;
		};
	});
</script>

<nav class="no-print">
	<a href={resolve('/[month=month]', { month: data.month })}>← 稼働入力へ戻る</a>
	<button onclick={() => window.print()}>印刷 / PDF として保存</button>
</nav>

<div class="preview">
	{#if error}
		<p class="error">読み込めませんでした: {error}</p>
	{:else if report}
		<ReportSheet {report} />
	{/if}
</div>

<style>
	nav {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.error {
		padding: 1rem;
		color: var(--error);
	}
</style>
