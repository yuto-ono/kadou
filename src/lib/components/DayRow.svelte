<script lang="ts">
	import { breakTotal } from '$lib/domain/breaks';
	import { weekdayLabel } from '$lib/domain/calendar';
	import { DAY_TYPES, DAY_TYPE_LABEL } from '$lib/domain/defaults';
	import { formatDuration } from '$lib/domain/time';
	import type { DayRecord, DayType } from '$lib/domain/types';
	import type { Issue } from '$lib/domain/validate/issue';
	import { dailyWorkMinutes } from '$lib/domain/workday';
	import TimeCell from './TimeCell.svelte';

	/**
	 * 一覧の 1 行（SPEC.md §6.1「一覧」）。
	 *
	 * 区分・開始・終了は行で直接編集する。休憩と作業内容は表示のみで、編集は詳細
	 * パネル。毎日発生する入力を一覧で完結させるため。
	 */
	interface Props {
		day: DayRecord;
		issues: Issue[];
		selected: boolean;
		canCopyPrevious: boolean;
		onSelect: () => void;
		onChangeDayType: (next: DayType) => void;
		onChangeTime: (field: 'startTime' | 'endTime', value: string | null) => void;
		onCopyPrevious: () => void;
	}

	let {
		day,
		issues,
		selected,
		canCopyPrevious,
		onSelect,
		onChangeDayType,
		onChangeTime,
		onCopyPrevious
	}: Props = $props();

	const weekday = $derived(weekdayLabel(day.date));
	const isWeekend = $derived(weekday === '土' || weekday === '日');
	const workMinutes = $derived(dailyWorkMinutes(day));
	const breakMinutes = $derived(breakTotal(day.breaks));
	const invalid = $derived((field: string) => issues.some((i) => i.target.field === field));
</script>

<tr class:weekend={isWeekend} class:selected aria-selected={selected}>
	<td class="date">{Number(day.date.slice(-2))}</td>
	<td class="weekday">{weekday}</td>
	<td>
		<select
			aria-label="{day.date} の区分"
			value={day.dayType}
			onchange={(e) => {
				const next = e.currentTarget.value as DayType;
				// 確認が要る場合、データはまだ変わらない。DOM の選択だけが先に進むと、
				// キャンセルしたのに新しい区分が選ばれたままになるので、いったん戻す
				// （SPEC.md §6.1）。適用されれば直後の再描画で next に変わる
				e.currentTarget.value = day.dayType;
				onChangeDayType(next);
			}}
		>
			{#each DAY_TYPES as type (type)}
				<option value={type}>{DAY_TYPE_LABEL[type]}</option>
			{/each}
		</select>
	</td>
	<td>
		<TimeCell
			value={day.startTime}
			invalid={invalid('startTime')}
			label="{day.date} の開始時刻"
			onCommit={(v) => onChangeTime('startTime', v)}
		/>
	</td>
	<td>
		<TimeCell
			value={day.endTime}
			invalid={invalid('endTime')}
			label="{day.date} の終了時刻"
			onCommit={(v) => onChangeTime('endTime', v)}
		/>
	</td>
	<!-- 休憩は合計のみ表示。編集は詳細パネル（SPEC.md §6.1） -->
	<td class="num" class:field-error={invalid('breaks')}>
		{breakMinutes > 0 ? formatDuration(breakMinutes) : ''}
	</td>
	<td class="num strong">{workMinutes === null ? '' : formatDuration(workMinutes)}</td>
	<td class="content">
		<!-- 編集可能セルのクリックは一覧側の編集。ここを押すとパネルが開く（SPEC.md §6.1） -->
		<button class="open" onclick={onSelect} title="この日の詳細を開く">
			<span class="text">{day.workContent}</span>
			{#if day.journal !== ''}<span class="mark" title="メモあり">✎</span>{/if}
		</button>
	</td>
	<td>
		<button
			class="copy"
			disabled={!canCopyPrevious}
			onclick={onCopyPrevious}
			title="直前の稼働日の開始・終了・休憩を複製する"
		>
			前日
		</button>
	</td>
</tr>

<style>
	tr.weekend {
		background: var(--row-weekend);
	}

	tr.selected {
		background: var(--row-selected);
	}

	td {
		padding: 1px 4px;
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
	}

	.date {
		width: 2.5rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.weekday {
		width: 1.5rem;
		text-align: center;
		color: var(--muted);
	}

	.num {
		width: 4rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.strong {
		font-weight: 600;
	}

	.content {
		width: 100%;
		max-width: 0;
	}

	.open {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		width: 100%;
		padding: 0.15rem 0.3rem;
		border: 1px solid transparent;
		border-radius: 3px;
		background: none;
		text-align: left;
	}

	.open:hover {
		border-color: var(--border);
		background: #fff;
	}

	.text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mark {
		flex: none;
		color: var(--accent);
	}

	.copy {
		padding: 0.05rem 0.35rem;
		font-size: 0.75rem;
	}
</style>
