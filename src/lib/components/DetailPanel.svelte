<script lang="ts">
	import { weekdayLabel } from '$lib/domain/calendar';
	import { DAY_TYPES, DAY_TYPE_LABEL } from '$lib/domain/defaults';
	import { messageOf } from '$lib/domain/messages';
	import { formatDuration } from '$lib/domain/time';
	import type { DayRecord, DayType } from '$lib/domain/types';
	import { contentLength, WORK_CONTENT_MAX } from '$lib/domain/validate/day';
	import type { Issue } from '$lib/domain/validate/issue';
	import { dailyWorkMinutes } from '$lib/domain/workday';
	import BreakEditor from './BreakEditor.svelte';
	import TimeCell from './TimeCell.svelte';

	/**
	 * 詳細パネル（SPEC.md §6.1「詳細パネル」）。
	 *
	 * モーダルではなく右サイドパネルとするのは、開いている間も月次サマリと一覧が
	 * 見え続けるため。パネルを閉じずに別の日へ移れる。
	 *
	 * 並びは書く頻度の順。時刻 → 休憩 → 作業内容は毎日、メモは要るときだけ。
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
	const workMinutes = $derived(dailyWorkMinutes(day));
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
		onChange({
			workContent: [...text].slice(0, WORK_CONTENT_MAX).join(''),
			contentAutoFilled: false
		});
	}
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
				<strong class="tnum">{workMinutes === null ? '—' : formatDuration(workMinutes)}</strong>
			</p>
		</div>

		<div class="field">
			<span class="label">開始 〜 終了</span>
			<div class="times">
				<TimeCell
					value={day.startTime}
					quiet={false}
					invalid={timeIssues.some((i) => i.target.field === 'startTime')}
					label="開始時刻"
					onCommit={(v) => onChange({ startTime: v })}
				/>
				<span class="sep" aria-hidden="true">〜</span>
				<TimeCell
					value={day.endTime}
					quiet={false}
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
	</section>

	<section class="block">
		<label class="field">
			<span class="label">
				作業内容
				<small class="count tnum" class:over={remaining < 0}>残り {remaining}</small>
			</span>
			<input
				class:field-error={contentIssues.length > 0}
				value={day.workContent}
				maxlength={WORK_CONTENT_MAX}
				placeholder="報告書の明細表に出ます"
				oninput={(e) => setContent(e.currentTarget.value)}
			/>
			{#if contentIssues.length > 0}
				<ul class="issues">
					{#each contentIssues as issue, i (i)}<li>{messageOf(issue)}</li>{/each}
				</ul>
			{/if}
		</label>
	</section>

	<label class="field grow-area">
		<!-- 報告書には出力しない。整形済みのプレビューは設けない（SPEC.md §6.1） -->
		<span class="label">メモ <small>報告書には出ません</small></span>
		<textarea
			value={day.journal}
			placeholder="下限割れや長時間稼働の理由など、後から思い出すための覚え書き"
			oninput={(e) => onChange({ journal: e.currentTarget.value })}
		></textarea>
	</label>
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

	.times {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	/* 色は区切り文字だけに効かせる。まとめて指定すると入力欄が inherit で薄くなる */
	.sep {
		color: var(--fg-subtle);
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

	textarea {
		flex: 1;
		min-height: 7rem;
		resize: vertical;
		font-size: 0.85rem;
	}

	::placeholder {
		color: var(--fg-subtle);
	}
</style>
