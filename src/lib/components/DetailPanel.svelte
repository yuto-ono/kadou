<script lang="ts">
	import { weekdayLabel } from '$lib/domain/calendar';
	import { DAY_TYPES, DAY_TYPE_LABEL } from '$lib/domain/defaults';
	import { messageOf } from '$lib/domain/messages';
	import type { DayRecord, DayType } from '$lib/domain/types';
	import { contentLength, WORK_CONTENT_MAX } from '$lib/domain/validate/day';
	import type { Issue } from '$lib/domain/validate/issue';
	import BreakEditor from './BreakEditor.svelte';
	import TimeCell from './TimeCell.svelte';

	/**
	 * 詳細パネル（SPEC.md §6.1「詳細パネル」）。
	 *
	 * モーダルではなく右サイドパネルとするのは、開いている間も月次サマリと一覧が
	 * 見え続けるため。パネルを閉じずに別の日へ移れる。
	 */
	interface Props {
		day: DayRecord;
		issues: Issue[];
		onClose: () => void;
		onChange: (patch: Partial<DayRecord>) => void;
		onChangeDayType: (next: DayType) => void;
	}

	let { day, issues, onClose, onChange, onChangeDayType }: Props = $props();

	const remaining = $derived(WORK_CONTENT_MAX - contentLength(day.workContent));
	const contentIssues = $derived(issues.filter((i) => i.target.field === 'workContent'));
	const breakIssues = $derived(
		issues.filter((i) => i.target.breakIndex !== undefined || i.target.field === 'breaks')
	);
	const timeIssues = $derived(
		issues.filter((i) => i.target.field === 'startTime' || i.target.field === 'endTime')
	);

	/**
	 * 30 文字を超える入力は受け付けない（SPEC.md §4.2）。
	 *
	 * 上限を守れば印字幅に収まることが保証され、31 行 1 ページの制約が確定する。
	 * 改行も受け付けない。行高が可変になると同じ制約が崩れる。
	 */
	function setContent(raw: string) {
		const text = raw.replace(/[\r\n]+/g, ' ');
		onChange({ workContent: [...text].slice(0, WORK_CONTENT_MAX).join(''), contentAutoFilled: false });
	}
</script>

<aside class="panel" aria-label="{day.date} の詳細">
	<header>
		<h2>{Number(day.date.slice(5, 7))}月{Number(day.date.slice(-2))}日（{weekdayLabel(day.date)}）</h2>
		<button onclick={onClose} aria-label="詳細パネルを閉じる">閉じる</button>
	</header>

	<label class="field">
		<span>区分</span>
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

	<div class="field">
		<span>開始 〜 終了</span>
		<div class="times">
			<TimeCell
				value={day.startTime}
				invalid={timeIssues.some((i) => i.target.field === 'startTime')}
				label="開始時刻"
				onCommit={(v) => onChange({ startTime: v })}
			/>
			<span aria-hidden="true">〜</span>
			<TimeCell
				value={day.endTime}
				invalid={timeIssues.some((i) => i.target.field === 'endTime')}
				label="終了時刻"
				onCommit={(v) => onChange({ endTime: v })}
			/>
		</div>
		{#if timeIssues.length > 0}
			<ul class="issues">
				{#each timeIssues as issue, i (i)}<li>{messageOf(issue)}</li>{/each}
			</ul>
		{/if}
	</div>

	<BreakEditor {day} issues={breakIssues} onChange={(breaks) => onChange({ breaks })} />

	<label class="field">
		<span>作業内容 <small class:over={remaining < 0}>残り {remaining}</small></span>
		<input
			class:field-error={contentIssues.length > 0}
			value={day.workContent}
			maxlength={WORK_CONTENT_MAX}
			oninput={(e) => setContent(e.currentTarget.value)}
		/>
		{#if contentIssues.length > 0}
			<ul class="issues">
				{#each contentIssues as issue, i (i)}<li>{messageOf(issue)}</li>{/each}
			</ul>
		{/if}
	</label>

	<label class="field grow">
		<!-- 報告書には出力しない。整形済みのプレビューは設けない（SPEC.md §6.1） -->
		<span>メモ <small>報告書には出力されません</small></span>
		<textarea value={day.journal} oninput={(e) => onChange({ journal: e.currentTarget.value })}
		></textarea>
	</label>
</aside>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: var(--panel-width);
		padding: 0.75rem 1rem;
		overflow-y: auto;
		border-left: 1px solid var(--border);
		background: var(--bg);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h2 {
		margin: 0;
		font-size: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.field > span {
		color: var(--muted);
		font-size: 0.8rem;
	}

	small {
		margin-left: 0.3rem;
		font-size: 0.75rem;
	}

	small.over {
		color: var(--error);
	}

	.times {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.grow {
		flex: 1;
		min-height: 8rem;
	}

	textarea {
		flex: 1;
		min-height: 8rem;
		resize: vertical;
		font-family: ui-monospace, 'SF Mono', monospace;
		font-size: 0.85rem;
	}
</style>
