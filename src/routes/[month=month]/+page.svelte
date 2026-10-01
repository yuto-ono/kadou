<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { removeMonth } from '$lib/client/api';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DayTable from '$lib/components/DayTable.svelte';
	import DetailPanel from '$lib/components/DetailPanel.svelte';
	import IssueList from '$lib/components/IssueList.svelte';
	import MonthSelector from '$lib/components/MonthSelector.svelte';
	import MonthSummary from '$lib/components/MonthSummary.svelte';
	import TextField from '$lib/components/TextField.svelte';
	import { CONTRACT_TEMPLATE } from '$lib/persistence/contract-template';
	import type { DayType } from '$lib/domain/types';
	import { ContractStore } from '$lib/state/contract.svelte';
	import { MonthStore } from '$lib/state/month.svelte';
	import { MonthsStore } from '$lib/state/months.svelte';
	import type { PageProps } from './$types';

	/** 稼働入力（SPEC.md §6.1） */
	let { data }: PageProps = $props();

	const contract = new ContractStore();
	const months = new MonthsStore();
	let store = $state<MonthStore | null>(null);

	/** 区分変更の確認（SPEC.md §6.1「区分変更時の稼働データのクリア」） */
	let pendingChange = $state<{ date: string; next: DayType } | null>(null);
	let confirmDelete = $state(false);

	// 月が変われば別のストアを作り直す。URL が対象の月を持つ（SPEC.md §6）
	$effect(() => {
		const month = data.month;
		let active = true;

		void (async () => {
			if (contract.contract === null && !contract.missing && contract.loadError === null) {
				await contract.load();
			}
			await months.load();
			const s = new MonthStore(month, () => contract.contract?.maxEndTime ?? '28:00');
			await s.load();
			if (active) store = s;
		})();

		return () => {
			active = false;
			void store?.flush();
		};
	});

	// 離脱前に未保存の変更を書き出す（SPEC.md §4.5「書き込み」）
	beforeNavigate(() => void store?.flush());

	async function remove() {
		confirmDelete = false;
		await store?.flush();
		await removeMonth(data.month);
		await goto(resolve('/'), { invalidateAll: true });
	}

	function closePanel() {
		// 並べ替えはパネルを閉じたときに行う（SPEC.md §4.3）
		if (store?.selectedDate) store.sortPeriods(store.selectedDate);
		if (store) store.selectedDate = null;
	}
</script>

<svelte:head>
	<!-- 月をブックマークする前提（SPEC.md §6）。対象の月を先頭に置く -->
	<title>{data.month} 稼働時間記録</title>
</svelte:head>

<svelte:window
	onbeforeunload={() => void store?.flush()}
	onkeydown={(e) => {
		if (e.key === 'Escape' && store?.selectedDate) closePanel();
	}}
/>

<div class="page">
	<header class="bar">
		<MonthSelector
			current={data.month}
			months={months.months}
			beforeLeave={async () => await store?.flush()}
		/>
		<div class="spacer"></div>
		{#if store?.unsaved}<span class="unsaved">未保存</span>{/if}
		{#if store?.state === 'ready'}
			<a href={resolve('/[month=month]/report', { month: data.month })}>報告書</a>
			<button onclick={() => (confirmDelete = true)}>この月を削除</button>
		{/if}
	</header>

	{#if contract.missing}
		<section class="notice">
			<p>
				<strong>contract.yaml がありません。</strong>
				データディレクトリに次の内容で作成してください。このファイルはアプリから書き換えません。
			</p>
			<pre>{CONTRACT_TEMPLATE}</pre>
		</section>
	{:else if contract.loadError}
		<IssueList title="contract.yaml を読み込めません" issues={[]} />
		<p class="notice">{contract.loadError}</p>
	{/if}

	<IssueList title="contract.yaml の内容に問題があります" issues={contract.issues} />

	{#if store === null || store.state === 'loading'}
		<p class="notice">読み込み中…</p>
	{:else if store.state === 'missing'}
		<section class="notice">
			<p>{data.month} はまだ作成されていません。</p>
			<button disabled={!contract.canCreateMonth} onclick={() => contract.contract && store?.create(contract.contract)}>
				この月を作成する
			</button>
			{#if !contract.canCreateMonth}
				<p class="hint">
					契約設定に問題があるため作成できません。不正な値が月へ焼き付くのを防ぐためです。
				</p>
			{/if}
		</section>
	{:else if store.state === 'error'}
		<p class="notice error">読み込めませんでした: {store.loadError}</p>
	{:else if store.data && store.summary}
		{#if store.saveError}
			<p class="notice error">保存できませんでした: {store.saveError}</p>
		{/if}
		<IssueList title="ファイルの内容に問題があります" issues={store.fileIssues} />

		<MonthSummary summary={store.summary} contract={store.data.contract} />

		<details class="remarks">
			<summary>
				特記事項
				<span class="preview">{store.data.remarks || '報告書のフッタに出力されます'}</span>
			</summary>
			<!-- 開いている間は要約行の重複を消す -->
			<TextField
				value={store.data.remarks}
				label="特記事項"
				multiline
				placeholder="下限割れや超過の理由など、客先へ説明することがあれば書く"
				onCommit={(remarks) => store?.setRemarks(remarks)}
			/>
		</details>

		<div class="body">
			<div class="list">
				<DayTable {store} onConfirmClear={(date, next) => (pendingChange = { date, next })} />
			</div>

			{#if store.selectedDay}
				<!-- 別の日へ移ったら作り直す。入力途中の区間を持ち越さない（SPEC.md §6.1） -->
				{#key store.selectedDay.date}
					<DetailPanel
						day={store.selectedDay}
						issues={store.dayIssues[store.selectedDay.date] ?? []}
						suggestion={store.suggestContent(store.selectedDay.date)}
						onClose={closePanel}
						onChange={(patch) => store?.updateDay(store.selectedDate!, patch)}
						onChangeDayType={(next) => {
							const date = store!.selectedDate!;
							if (store!.needsClearConfirm(date, next)) pendingChange = { date, next };
							else store!.changeDayType(date, next);
						}}
					/>
				{/key}
			{/if}
		</div>
	{/if}
</div>

{#if pendingChange}
	<ConfirmDialog
		title="稼働データを消します"
		message="この日には稼働区間が入力されています。区分を変えると、すべて消します。"
		confirmLabel="消して変更する"
		onConfirm={() => {
			store?.changeDayType(pendingChange!.date, pendingChange!.next);
			pendingChange = null;
		}}
		onCancel={() => (pendingChange = null)}
	/>
{/if}

{#if confirmDelete}
	<ConfirmDialog
		title="{data.month} を削除します"
		message="アプリ内に取り消しはありません。git で管理していれば直前のコミットから戻せます。"
		confirmLabel="削除する"
		onConfirm={remove}
		onCancel={() => (confirmDelete = false)}
	/>
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--bg-app);
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 1.25rem;
		border-bottom: 1px solid var(--line);
		background: var(--surface);
	}

	.spacer {
		flex: 1;
	}

	.unsaved {
		color: var(--fg-subtle);
		font-size: 0.75rem;
	}

	/* 月に一度しか書かない欄。開いたままにはせず、要るときだけ広げる */
	.remarks {
		border-bottom: 1px solid var(--line);
		background: var(--surface);
		font-size: 0.8rem;
	}

	.remarks summary {
		display: flex;
		gap: 0.6rem;
		padding: 0.35rem 1.25rem;
		color: var(--fg-muted);
		cursor: pointer;
	}

	.remarks summary:hover {
		background: var(--accent-tint);
	}

	.preview {
		overflow: hidden;
		color: var(--fg-subtle);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.remarks[open] .preview {
		display: none;
	}

	.remarks :global(textarea) {
		display: block;
		width: calc(100% - 2.5rem);
		min-height: 3.5rem;
		margin: 0 1.25rem 0.6rem;
		resize: vertical;
	}

	.body {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	.list {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
		overflow-y: auto;
		background: var(--surface);
	}

	.notice {
		max-width: 46rem;
		margin: 1.25rem;
		padding: 1rem 1.25rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface);
	}

	.notice p {
		margin: 0 0 0.6rem;
	}

	.notice.error {
		border-color: var(--error);
		color: var(--error);
	}

	.hint {
		margin: 0.6rem 0 0;
		color: var(--fg-muted);
		font-size: 0.85rem;
	}

	pre {
		margin: 0.6rem 0 0;
		padding: 0.8rem 1rem;
		overflow-x: auto;
		border-radius: 6px;
		background: var(--surface-sunken);
		font-size: 0.78rem;
		line-height: 1.6;
	}
</style>
