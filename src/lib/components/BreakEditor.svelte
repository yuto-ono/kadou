<script lang="ts">
	import { breakTotal } from '$lib/domain/breaks';
	import { formatDuration } from '$lib/domain/time';
	import type { Break, DayRecord } from '$lib/domain/types';
	import type { Issue } from '$lib/domain/validate/issue';
	import { messageOf } from '$lib/domain/messages';
	import TimeCell from './TimeCell.svelte';

	/**
	 * 休憩区間の編集（SPEC.md §6.1「休憩の入力」）。
	 *
	 * 区間を縦に並べ、追加ボタンで増やす。並べ替えはパネルを閉じたときに行う。
	 * 入力の途中で並べ替えると行が動いてフォーカスが外れる（SPEC.md §4.3）。
	 */
	interface Props {
		day: DayRecord;
		issues: Issue[];
		onChange: (breaks: Break[]) => void;
	}

	let { day, issues, onChange }: Props = $props();

	// 稼働時間帯が定まらない日には休憩を入力できない（SPEC.md §6.1）
	const enabled = $derived(day.startTime !== null && day.endTime !== null);
	const total = $derived(breakTotal(day.breaks));
	const issueAt = $derived((index: number) => issues.filter((i) => i.target.breakIndex === index));
	const generalIssues = $derived(issues.filter((i) => i.target.field === 'breaks'));

	function update(index: number, patch: Partial<Break>) {
		onChange(day.breaks.map((b, i) => (i === index ? { ...b, ...patch } : b)));
	}

	function add() {
		onChange([...day.breaks, { start: day.startTime ?? '12:00', end: day.endTime ?? '13:00' }]);
	}

	function remove(index: number) {
		onChange(day.breaks.filter((_, i) => i !== index));
	}
</script>

<div class="breaks">
	<div class="head">
		<h3>休憩</h3>
		<span class="total">合計 {formatDuration(total)}</span>
	</div>

	{#each day.breaks as brk, index (index)}
		<div class="row">
			<TimeCell
				value={brk.start}
				quiet={false}
				invalid={issueAt(index).length > 0}
				label="休憩 {index + 1} の開始"
				onCommit={(v) => v !== null && update(index, { start: v })}
			/>
			<span class="sep" aria-hidden="true">〜</span>
			<TimeCell
				value={brk.end}
				quiet={false}
				invalid={issueAt(index).length > 0}
				label="休憩 {index + 1} の終了"
				onCommit={(v) => v !== null && update(index, { end: v })}
			/>
			<button onclick={() => remove(index)} aria-label="休憩 {index + 1} を削除">削除</button>
		</div>
		{#if issueAt(index).length > 0}
			<ul class="issues">
				{#each issueAt(index) as issue, i (i)}<li>{messageOf(issue)}</li>{/each}
			</ul>
		{/if}
	{/each}

	<button class="add" onclick={add} disabled={!enabled}>休憩を追加</button>

	{#if !enabled && day.breaks.length === 0}
		<p class="hint">開始時刻と終了時刻を入力すると追加できます</p>
	{/if}

	{#if generalIssues.length > 0}
		<ul class="issues">
			{#each generalIssues as issue, i (i)}<li>{messageOf(issue)}</li>{/each}
		</ul>
	{/if}
</div>

<style>
	.breaks {
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
