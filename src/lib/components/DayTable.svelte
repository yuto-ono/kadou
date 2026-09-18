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
</script>

<table>
	<thead>
		<tr>
			<th colspan="2">日付</th>
			<th>区分</th>
			<th>開始</th>
			<th>終了</th>
			<th class="num">休憩</th>
			<th class="num">稼働</th>
			<th class="content">作業内容</th>
			<th><span class="sr-only">操作</span></th>
		</tr>
	</thead>
	<tbody>
		{#each store.data?.days ?? [] as day (day.date)}
			<DayRow
				{day}
				issues={store.dayIssues[day.date] ?? []}
				selected={store.selectedDate === day.date}
				isToday={day.date === todayDate}
				canCopyPrevious={store.previousWorkday(day.date) !== null}
				onSelect={() => (store.selectedDate = day.date)}
				onChangeDayType={(next) => changeDayType(day.date, next)}
				onChangeTime={(field, value) => store.updateDay(day.date, { [field]: value })}
				onCopyPrevious={() => store.copyPreviousWorkday(day.date)}
			/>
		{/each}
	</tbody>
</table>

<style>
	table {
		width: 100%;
		border-collapse: collapse;
		background: var(--surface);
	}

	thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		height: 1.8rem;
		padding: 0 0.3rem;
		border-bottom: 1px solid var(--line-strong);
		background: var(--surface);
		color: var(--fg-subtle);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		white-space: nowrap;
		text-align: left;
	}

	th.num {
		text-align: right;
	}

	th.content {
		width: 100%;
		padding-left: 0.85rem;
		border-left: 1px solid var(--line);
	}
</style>
