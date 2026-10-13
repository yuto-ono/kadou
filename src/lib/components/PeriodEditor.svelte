<script lang="ts">
	import { tick } from 'svelte';
	import { messageOf } from '$lib/domain/messages';
	import { formatDuration } from '$lib/domain/time';
	import type { DayRecord, WorkPeriod } from '$lib/domain/types';
	import type { Issue } from '$lib/domain/validate/issue';
	import { dayTimes } from '$lib/domain/workday';
	import type { PendingPeriod } from '$lib/state/pendingPeriods.svelte';
	import TimeCell from './TimeCell.svelte';

	/**
	 * 稼働区間の編集（SPEC.md §6.1「稼働区間の入力」）。
	 *
	 * 区間を縦に並べ、追加ボタンで増やす。並べ替えはパネルを閉じたときに行う。
	 * 入力の途中で並べ替えると行が動いてフォーカスが外れる（SPEC.md §4.3）。
	 *
	 * 追加した区間は開始・終了とも空欄で始め、両方そろうまではデータに入れず
	 * `pending` として外に持たせる。パネルを閉じたり別の日へ移ったりしても残すため。
	 */
	interface Props {
		day: DayRecord;
		issues: Issue[];
		pending: PendingPeriod | null;
		onChange: (periods: WorkPeriod[]) => void;
		onPendingChange: (pending: PendingPeriod | null) => void;
	}

	let { day, issues, pending, onChange, onPendingChange }: Props = $props();

	let container: HTMLElement;

	const times = $derived(dayTimes(day));
	const issueAt = $derived((index: number) => issues.filter((i) => i.target.periodIndex === index));

	function update(index: number, patch: Partial<WorkPeriod>) {
		onChange(day.workPeriods.map((p, i) => (i === index ? { ...p, ...patch } : p)));
	}

	function remove(index: number) {
		onChange(day.workPeriods.filter((_, i) => i !== index));
	}

	async function add() {
		onPendingChange({ start: null, end: null });
		await tick();
		container.querySelector<HTMLInputElement>('.pending input')?.focus();
	}

	function fill(patch: Partial<PendingPeriod>) {
		if (pending === null) return;
		const next = { ...pending, ...patch };
		if (next.start !== null && next.end !== null) {
			onChange([...day.workPeriods, { start: next.start, end: next.end }]);
			onPendingChange(null);
		} else {
			onPendingChange(next);
		}
	}
</script>

<div class="periods" bind:this={container}>
	<div class="head">
		<h3>稼働区間</h3>
		<span class="total">休憩 {times?.breakMinutes == null ? '—' : formatDuration(times.breakMinutes)}</span>
	</div>

	{#each day.workPeriods as period, index (index)}
		<div class="row">
			<TimeCell
				value={period.start}
				quiet={false}
				invalid={issueAt(index).length > 0}
				label="区間 {index + 1} の開始"
				onCommit={(v) => v !== null && update(index, { start: v })}
			/>
			<span class="sep" aria-hidden="true">〜</span>
			<TimeCell
				value={period.end}
				quiet={false}
				invalid={issueAt(index).length > 0}
				label="区間 {index + 1} の終了"
				onCommit={(v) => v !== null && update(index, { end: v })}
			/>
			<button onclick={() => remove(index)} aria-label="区間 {index + 1} を削除">削除</button>
		</div>
		{#if issueAt(index).length > 0}
			<ul class="issues">
				{#each issueAt(index) as issue, i (i)}<li>{messageOf(issue)}</li>{/each}
			</ul>
		{/if}
	{/each}

	{#if pending}
		<div class="row pending">
			<TimeCell
				value={pending.start}
				quiet={false}
				label="追加する区間の開始"
				onCommit={(v) => fill({ start: v })}
			/>
			<span class="sep" aria-hidden="true">〜</span>
			<TimeCell value={pending.end} quiet={false} label="追加する区間の終了" onCommit={(v) => fill({ end: v })} />
			<button onclick={() => onPendingChange(null)} aria-label="追加する区間を取り消す">取消</button>
		</div>
	{:else if day.workPeriods.length === 0}
		<p class="hint">稼働区間はありません</p>
	{/if}

	<button class="add" onclick={add} disabled={pending !== null}>区間を追加</button>
</div>

<style>
	.periods {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		align-items: flex-start;
	}

	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		width: 100%;
	}

	h3 {
		margin: 0;
		color: var(--fg-muted);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.03em;
	}

	.total {
		color: var(--fg-muted);
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0.15rem 0;
	}

	.sep {
		color: var(--fg-subtle);
	}

	.row button {
		padding: 0.05rem 0.4rem;
		border-color: transparent;
		color: var(--fg-subtle);
		font-size: 0.72rem;
	}

	.row:hover button {
		border-color: var(--line-strong);
	}

	.add {
		margin-top: 0.15rem;
		padding: 0.1rem 0.5rem;
		font-size: 0.78rem;
	}

	.hint {
		margin: 0.2rem 0 0;
		color: var(--fg-subtle);
		font-size: 0.75rem;
	}
</style>
