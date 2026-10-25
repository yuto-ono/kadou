<script lang="ts">
	import { weekdayLabel } from '#lib/domain/calendar.ts';
	import { DAY_TYPES, DAY_TYPE_LABEL } from '#lib/domain/defaults.ts';
	import { messageOf } from '#lib/domain/messages.ts';
	import { formatDuration } from '#lib/domain/time.ts';
	import type { DayRecord, DayType } from '#lib/domain/types.ts';
	import { WORK_CONTENT_MAX } from '#lib/domain/validate/day.ts';
	import type { Issue } from '#lib/domain/validate/issue.ts';
	import { dayTimes } from '#lib/domain/workday.ts';
	import type { PendingPeriod } from '#lib/state/pendingPeriods.svelte.ts';
	import PeriodEditor from './PeriodEditor.svelte';
	import TextField from './TextField.svelte';

	/**
	 * 詳細パネル（SPEC.md §6.1「詳細パネル」）。
	 *
	 * モーダルではなく右サイドパネルとするのは、開いている間も月次サマリと一覧が
	 * 見え続けるため。パネルを閉じずに別の日へ移れる。
	 *
	 * 並びは書く頻度の順。稼働区間 → 作業内容は毎日、メモは要るときだけ。区分と
	 * 作業内容は一覧でも編集できる。どちらも同じ日次レコードを参照するだけなので、
	 * 値を二重に持つことはない（SPEC.md §6.1）。
	 */
	interface Props {
		day: DayRecord;
		issues: Issue[];
		onClose: () => void;
		/** 空欄の作業内容へフォーカスしたときに入れる前回の内容（SPEC.md §6.1「入力補助」） */
		suggestion: string | null;
		onChange: (patch: Partial<DayRecord>) => void;
		onChangeDayType: (next: DayType) => void;
		pendingPeriod: PendingPeriod | null;
		onPendingPeriodChange: (period: PendingPeriod | null) => void;
	}

	let {
		day,
		issues,
		suggestion,
		onClose,
		onChange,
		onChangeDayType,
		pendingPeriod,
		onPendingPeriodChange
	}: Props = $props();

	let contentLength = $state(0);
	const remaining = $derived(WORK_CONTENT_MAX - contentLength);
	const times = $derived(dayTimes(day));
	const contentIssues = $derived(issues.filter((i) => i.target.field === 'workContent'));
	const periodIssues = $derived(issues.filter((i) => i.target.periodIndex !== undefined));
</script>

<aside class="panel" aria-label="{day.date} の詳細">
	<header>
		<div class="title">
			<h2>{Number(day.date.slice(5, 7))}月{Number(day.date.slice(-2))}日</h2>
			<span class="weekday">（{weekdayLabel(day.date)}）</span>
		</div>
		<button class="close" onclick={onClose} aria-label="詳細パネルを閉じる（Esc）" title="Esc">
			閉じる
		</button>
	</header>

	<section class="block">
		<div class="row">
			<label class="grow">
				<span class="label">区分</span>
				<select
					value={day.dayType}
					onchange={(e) => {
						const next = e.currentTarget.value as DayType;
						// 一覧側と同じ理由（SPEC.md §6.1）
						e.currentTarget.value = day.dayType;
						onChangeDayType(next);
					}}
				>
					{#each DAY_TYPES as type (type)}
						<option value={type}>{DAY_TYPE_LABEL[type]}</option>
					{/each}
				</select>
			</label>
			<p class="worked">
				<span class="label">稼働</span>
				<strong class="tnum">{times === null ? '—' : formatDuration(times.workMinutes)}</strong>
			</p>
		</div>

		<PeriodEditor
			{day}
			issues={periodIssues}
			pending={pendingPeriod}
			onChange={(workPeriods) => onChange({ workPeriods })}
			onPendingChange={onPendingPeriodChange}
		/>
	</section>

	<section class="block">
		<div class="field">
			<span class="label">
				作業内容・備考
				<small class="count tnum" class:over={remaining < 0}>残り {remaining}</small>
			</span>
			<TextField
				value={day.workContent}
				label="作業内容・備考"
				maxLength={WORK_CONTENT_MAX}
				placeholder="報告書の明細表に出ます"
				invalid={contentIssues.length > 0}
				{suggestion}
				bind:length={contentLength}
				onCommit={(workContent) => onChange({ workContent, contentAutoFilled: false })}
			/>
			{#if contentIssues.length > 0}
				<ul class="issues">
					{#each contentIssues as issue, i (i)}<li>{messageOf(issue)}</li>{/each}
				</ul>
			{/if}
		</div>
	</section>

	<div class="field grow-area">
		<!-- 報告書には出力しない。整形済みのプレビューは設けない（SPEC.md §6.1） -->
		<span class="label">メモ <small>報告書には出ません</small></span>
		<TextField
			value={day.journal}
			label="メモ"
			multiline
			onCommit={(journal) => onChange({ journal })}
		/>
	</div>
</aside>

<style>
	.panel {
		display: flex;
		flex: none;
		flex-direction: column;
		gap: 0.9rem;
		width: var(--panel-width);
		padding: 0.85rem 1.1rem 1.1rem;
		overflow-y: auto;
		border-left: 1px solid var(--line);
		background: var(--surface);
	}

	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid var(--line);
	}

	.title {
		display: flex;
		align-items: baseline;
		gap: 0.2rem;
	}

	h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 650;
	}

	.weekday {
		color: var(--fg-muted);
		font-size: 0.85rem;
	}

	.close {
		padding: 0.1rem 0.5rem;
		font-size: 0.78rem;
	}

	.block {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		padding-bottom: 0.9rem;
		border-bottom: 1px solid var(--line);
	}

	.row {
		display: flex;
		align-items: flex-end;
		gap: 1rem;
	}

	.field,
	.row label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.grow {
		flex: 1;
	}

	.label {
		color: var(--fg-muted);
		font-size: 0.72rem;
		letter-spacing: 0.03em;
	}

	.worked {
		margin: 0;
		text-align: right;
	}

	.worked strong {
		display: block;
		font-size: 1.15rem;
		font-weight: 650;
		line-height: 1.3;
	}

	small {
		margin-left: 0.25rem;
		color: var(--fg-subtle);
		font-size: 0.92em;
	}

	.count.over {
		color: var(--error);
	}

	.grow-area {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.2rem;
		min-height: 7rem;
	}

	.grow-area :global(textarea) {
		flex: 1;
		min-height: 7rem;
		resize: vertical;
		font-size: 0.85rem;
	}

	.panel :global(::placeholder) {
		color: var(--fg-subtle);
	}
</style>
