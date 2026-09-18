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
		if (store?.selectedDate) store.sortBreaks(store.selectedDate);
		if (store) store.selectedDate = null;
	}
</script>

<svelte:window onbeforeunload={() => void store?.flush()} />

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

		<div class="body">
			<div class="list">
				<DayTable
					{store}
					onConfirmClear={(date, next) => (pendingChange = { date, next })}
				/>
				<label class="remarks">
					<span>特記事項 <small>報告書のフッタに出力されます</small></span>
					<textarea
						value={store.data.remarks}
						oninput={(e) => store?.setRemarks(e.currentTarget.value)}
					></textarea>
				</label>
			</div>

			{#if store.selectedDay}
				<DetailPanel
					day={store.selectedDay}
					issues={store.dayIssues[store.selectedDay.date] ?? []}
					onClose={closePanel}
					onChange={(patch) => store?.updateDay(store.selectedDate!, patch)}
					onChangeDayType={(next) => {
						const date = store!.selectedDate!;
						if (store!.needsClearConfirm(date, next)) pendingChange = { date, next };
						else store!.changeDayType(date, next);
					}}
				/>
			{/if}
		</div>
	{/if}
</div>

{#if pendingChange}
	<ConfirmDialog
		title="稼働データを消します"
		message="この日には開始・終了・休憩が入力されています。区分を変えると、これらをまとめて消します。"
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
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.spacer {
		flex: 1;
	}

	.unsaved {
		color: var(--muted);
		font-size: 0.8rem;
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
	}

	.notice {
		padding: 0.75rem 1rem;
	}

	.notice.error {
		color: var(--error);
	}

	.hint {
		color: var(--muted);
		font-size: 0.85rem;
	}

	pre {
		padding: 0.75rem;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--row-weekend);
		font-size: 0.8rem;
	}

	.remarks {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.75rem 1rem;
	}

	.remarks > span {
		color: var(--muted);
		font-size: 0.8rem;
	}

	.remarks textarea {
		min-height: 4rem;
		resize: vertical;
	}

	small {
		font-size: 0.75rem;
	}
</style>
