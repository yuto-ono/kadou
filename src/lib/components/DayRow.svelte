<script lang="ts">
	import { weekdayLabel } from '$lib/domain/calendar';
	import { DAY_TYPES, DAY_TYPE_LABEL } from '$lib/domain/defaults';
	import { formatDuration } from '$lib/domain/time';
	import type { DayRecord, DayType } from '$lib/domain/types';
	import { WORK_CONTENT_MAX } from '$lib/domain/validate/day';
	import type { Issue } from '$lib/domain/validate/issue';
	import { dayTimes } from '$lib/domain/workday';
	import TextField from './TextField.svelte';

	/**
	 * 一覧の 1 行（SPEC.md §6.1「一覧」）。
	 *
	 * 区分と作業内容は行で直接編集する。毎日手で打つのは作業内容なので、一覧で
	 * 完結させる。開始・終了・休憩・稼働は稼働区間からの導出値で、押すと詳細パネル
	 * が開く。稼働区間は個数が可変なので行に収めない。
	 */
	interface Props {
		day: DayRecord;
		issues: Issue[];
		selected: boolean;
		isToday: boolean;
		/** 空欄の作業内容へフォーカスしたときに入れる前回の内容（SPEC.md §6.1「入力補助」） */
		suggestion: string | null;
		onSelect: () => void;
		onChangeDayType: (next: DayType) => void;
		onChangeContent: (workContent: string) => void;
		/** 作業内容を Enter で確定したとき。次の日の作業内容へ移る */
		onContentEnter: () => void;
	}

	let {
		day,
		issues,
		selected,
		isToday,
		suggestion,
		onSelect,
		onChangeDayType,
		onChangeContent,
		onContentEnter
	}: Props = $props();

	const weekday = $derived(weekdayLabel(day.date));
	const times = $derived(dayTimes(day));
	const periodInvalid = $derived(issues.some((i) => i.target.periodIndex !== undefined));
	const contentInvalid = $derived(issues.some((i) => i.target.field === 'workContent'));
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
	<!--
		導出値の 4 列。どこを押しても詳細パネルが開く。Tab で止まるのは先頭の 1 つだけに
		して、作業内容から次の日へ移るときの停止位置を増やさない
	-->
	<td class="time">
		<button class="open tnum" class:field-error={periodInvalid} onclick={onSelect} title="稼働区間を編集する">
			{times?.start ?? ''}
		</button>
	</td>
	<td class="time">
		<button class="open tnum" class:field-error={periodInvalid} onclick={onSelect} tabindex="-1">
			{times?.end ?? ''}
		</button>
	</td>
	<td class="num faint">
		<button class="open tnum" onclick={onSelect} tabindex="-1">
			{times ? formatDuration(times.breakMinutes) : ''}
		</button>
	</td>
	<td class="num worked">
		<button class="open tnum" onclick={onSelect} tabindex="-1">
			{times === null ? '' : formatDuration(times.workMinutes)}
		</button>
	</td>
	<td class="content">
		<div class="content-cell">
			<TextField
				id="content-{day.date}"
				value={day.workContent}
				label="{day.date} の作業内容・備考"
				maxLength={WORK_CONTENT_MAX}
				quiet
				invalid={contentInvalid}
				{suggestion}
				onCommit={onChangeContent}
				onEnter={onContentEnter}
			/>
			{#if day.journal !== ''}<span class="mark" title="メモあり">✎</span>{/if}
		</div>
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

	.time {
		width: 4.9rem;
	}

	.num {
		width: 4.4rem;
	}

	.worked {
		padding-right: 1rem;
	}

	/* 導出値。入力欄に見せない。押せることはホバーで示す */
	.open {
		width: 100%;
		min-height: 1.6rem;
		padding: 0.1rem 0.25rem;
		border: 1px solid transparent;
		border-radius: 4px;
		background: none;
		color: inherit;
		font: inherit;
		text-align: center;
	}

	.num .open {
		text-align: right;
	}

	.faint .open {
		color: var(--fg-subtle);
	}

	.worked .open {
		font-weight: 600;
	}

	.open:hover {
		border-color: var(--line-strong);
		background: var(--surface);
	}

	/* 稼働区間にエラーがある日。直す場所は詳細パネルなので、開く入口に出す */
	.open.field-error {
		border-color: var(--error);
		background: var(--error-soft);
	}

	.content {
		width: 100%;
		max-width: 0;
		padding-left: 0.9rem;
		border-left: 1px solid var(--line);
	}

	.content-cell {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.content-cell :global(input) {
		flex: 1;
		min-width: 0;
		color: var(--fg-muted);
	}

	tr[data-daytype='work'] .content-cell :global(input) {
		color: var(--fg);
	}

	.mark {
		flex: none;
		color: var(--accent);
		font-size: 0.85em;
	}
</style>
