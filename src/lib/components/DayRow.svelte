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
		isToday: boolean;
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
		isToday,
		canCopyPrevious,
		onSelect,
		onChangeDayType,
		onChangeTime,
		onCopyPrevious
	}: Props = $props();

	const weekday = $derived(weekdayLabel(day.date));
	const workMinutes = $derived(dailyWorkMinutes(day));
	const breakMinutes = $derived(breakTotal(day.breaks));
	const invalid = $derived((field: string) => issues.some((i) => i.target.field === field));
</script>

<tr
	class:off={day.dayType !== 'work'}
	class:selected
	class:today={isToday}
	data-daytype={day.dayType}
	aria-selected={selected}
>
	<td class="date tnum">{Number(day.date.slice(-2))}</td>
	<td class="weekday">{weekday}</td>
	<td class="type">
		<span class="chip" aria-hidden="true"></span>
		<select
			class="quiet-field"
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
	<td class="num faint tnum" class:field-error={invalid('breaks')}>
		{breakMinutes > 0 ? formatDuration(breakMinutes) : ''}
	</td>
	<td class="num worked tnum">{workMinutes === null ? '' : formatDuration(workMinutes)}</td>
	<td class="content">
		<!-- 編集可能セルのクリックは一覧側の編集。ここを押すとパネルが開く（SPEC.md §6.1） -->
		<button class="open" onclick={onSelect} title="この日の詳細を開く">
			<span class="text">{day.workContent}</span>
			{#if day.journal !== ''}<span class="mark" title="メモあり">✎</span>{/if}
		</button>
	</td>
	<td class="actions">
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
	tr {
		height: var(--row-height);
	}

	tr:hover {
		background: var(--accent-tint);
	}

	/* 稼働しない日。背景ではなく彩度を落として、埋まっている日を前に出す */
	tr.off {
		background: var(--surface-sunken);
	}

	tr.off:hover {
		background: var(--accent-tint);
	}

	tr.selected,
	tr.selected:hover {
		background: var(--row-selected);
		box-shadow: inset 2px 0 0 var(--accent);
	}

	td {
		padding: 0 0.55rem;
		border-bottom: 1px solid var(--line);
		white-space: nowrap;
	}

	/* 今日。毎日開いて今日の行を埋めるのが主な用途なので、位置を見失わせない */
	tr.today td {
		border-bottom-color: var(--line-strong);
	}

	tr.today .date::before {
		position: absolute;
		left: 0;
		width: 3px;
		height: var(--row-height);
		margin-top: -0.35rem;
		background: var(--accent);
		content: '';
	}

	.date {
		position: relative;
		width: 3rem;
		padding-right: 0.2rem;
		color: var(--fg-muted);
		text-align: right;
	}

	tr.today .date {
		color: var(--accent-strong);
		font-weight: 650;
	}

	.weekday {
		width: 2.2rem;
		padding-left: 0.2rem;
		color: var(--fg-subtle);
		text-align: center;
	}

	.type {
		width: 6.6rem;
	}

	/* 区分の色。行全体を塗ると 30 行が騒がしくなるので、点で示す（SPEC.md §4.2） */
	.chip {
		display: inline-block;
		width: 5px;
		height: 5px;
		margin-right: 0.3rem;
		border-radius: 50%;
		vertical-align: 0.1em;
		background: transparent;
	}

	tr[data-daytype='weekend'] .chip {
		background: var(--type-weekend);
	}

	tr[data-daytype='holiday'] .chip {
		background: var(--type-holiday);
	}

	tr[data-daytype='personal'] .chip {
		background: var(--type-personal);
	}

	tr[data-daytype='clientClosed'] .chip {
		background: var(--type-client-closed);
	}

	.type select {
		width: 5.4rem;
		padding-left: 0.2rem;
		color: var(--fg-muted);
	}

	tr[data-daytype='work'] .type select {
		color: var(--fg);
	}

	.num {
		width: 4.4rem;
		text-align: right;
	}

	.faint {
		color: var(--fg-subtle);
	}

	.worked {
		padding-right: 1rem;
		font-weight: 600;
	}

	.content {
		width: 100%;
		max-width: 0;
		padding-left: 0.9rem;
		border-left: 1px solid var(--line);
	}

	.open {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		width: 100%;
		padding: 0.1rem 0.35rem;
		border: 1px solid transparent;
		border-radius: 4px;
		background: none;
		color: var(--fg-muted);
		text-align: left;
	}

	tr[data-daytype='work'] .open {
		color: var(--fg);
	}

	.open:hover {
		border-color: var(--line-strong);
		background: var(--surface);
	}

	.text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mark {
		flex: none;
		color: var(--accent);
		font-size: 0.85em;
	}

	.actions {
		width: 3.6rem;
		padding-right: 0.9rem;
	}

	/* 「前日」は 30 行ぶん常時出すと目立ちすぎる。行に触れたときだけ見せる */
	.copy {
		padding: 0 0.35rem;
		font-size: 0.72rem;
		opacity: 0;
		transition: opacity 0.1s;
	}

	tr:hover .copy,
	.copy:focus-visible {
		opacity: 1;
	}

	.copy:disabled {
		opacity: 0;
	}
</style>
