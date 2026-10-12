<script lang="ts">
	import { resolve } from '$app/paths';
	import { fetchMonthIfChanged, type MonthVersion } from '$lib/client/api';
	import { onReturn } from '$lib/client/return';
	import ReportSheet from '$lib/components/report/ReportSheet.svelte';
	import { buildReport, type ReportModel } from '$lib/domain/report';
	import type { PageProps } from './$types';

	/** 報告書プレビュー（SPEC.md §6.2）。A4 縦のレイアウトでそのまま表示する */
	let { data }: PageProps = $props();

	let report = $state<ReportModel | null>(null);
	let error = $state<string | null>(null);

	// 画面に戻ったときにも読み直す。外で直した YAML がそのまま報告書に映る
	// （SPEC.md §4.5「画面に戻ったときの読み直し」）
	$effect(() => {
		const month = data.month;
		let active = true;
		let version: MonthVersion = null;

		const load = async () => {
			try {
				const fresh = await fetchMonthIfChanged(month, version);
				if (!active || fresh === null) return;
				version = fresh.version;
				report = buildReport(fresh.data);
				error = null;
			} catch (e) {
				// 読み直しに失敗しても、出せている報告書は残す
				if (active && report === null) error = e instanceof Error ? e.message : String(e);
			}
		};

		void load();
		const off = onReturn(load);
		return () => {
			active = false;
			off();
		};
	});
</script>

<svelte:head>
	<!-- ブラウザの「PDF として保存」は、この文字列を既定のファイル名に使う -->
	<title>作業報告書 {data.month}</title>
</svelte:head>

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

	@page {
		size: A4 portrait;
		margin: 0;
	}

	@media print {
		.no-print {
			display: none !important;
		}
	}

	/* 画面では用紙の見た目を再現する */
	@media screen {
		.preview {
			padding: 8mm 0;
			background: #71717a;
		}
	}
</style>
