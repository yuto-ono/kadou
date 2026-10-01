<script lang="ts">
	import { today } from '$lib/client/clock';
	import type { DayType } from '$lib/domain/types';
	import type { MonthStore } from '$lib/state/month.svelte';
	import DayRow from './DayRow.svelte';

	/** 一覧（SPEC.md §6.1）。1 日〜末日の行が並ぶ */
	interface Props {
		store: MonthStore;
		/** 区分変更の確認が要る場合に呼ぶ。UI 側がモーダルを出す */
		onConfirmClear: (date: string, next: DayType) => void;
	}

	let { store, onConfirmClear }: Props = $props();

	const todayDate = today();

	function changeDayType(date: string, next: DayType) {
		if (store.needsClearConfirm(date, next)) onConfirmClear(date, next);
		else store.changeDayType(date, next);
	}

	/** 作業内容を Enter で確定したら、次の日の作業内容へ移る（SPEC.md §6.1「一覧」） */
	function focusNextContent(index: number) {
		const next = store.data?.days[index + 1];
		if (next) document.getElementById(`content-${next.date}`)?.focus();
		else (document.activeElement as HTMLElement | null)?.blur();
	}
</script>

<table>
	<thead>
		<tr>
			<th colspan="2">日付</th>
			<th>区分</th>
			<th class="time">開始</th>
			<th class="time">終了</th>
			<th class="num">休憩</th>
			<th class="num">稼働</th>
			<th class="content">作業内容</th>
		</tr>
	</thead>
	<tbody>
		{#each store.data?.days ?? [] as day, index (day.date)}
			<DayRow
				{day}
				issues={store.dayIssues[day.date] ?? []}
				selected={store.selectedDate === day.date}
				isToday={day.date === todayDate}
				suggestion={store.suggestContent(day.date)}
				onSelect={() => (store.selectedDate = day.date)}
				onChangeDayType={(next) => changeDayType(day.date, next)}
				onChangeContent={(workContent) => store.updateDay(day.date, { workContent, contentAutoFilled: false })}
				onContentEnter={() => focusNextContent(index)}
			/>
		{/each}
	</tbody>
</table>

<style>
	table {
		/* 作業内容が残り全部を取る。表を途中で切ると右側に空白が残って収まりが悪い */
		width: 100%;
		border-collapse: collapse;
		background: var(--surface);
	}

	thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		height: 2rem;
		padding: 0 0.55rem;
		border-bottom: 1px solid var(--line-strong);
		background: var(--surface);
		color: var(--fg-subtle);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		white-space: nowrap;
		text-align: left;
	}

	th.time {
		text-align: center;
	}

	th.num {
		text-align: right;
	}

	th.content {
		width: 100%;
		padding-left: 1.2rem;
		border-left: 1px solid var(--line);
	}
</style>
