<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { monthStringOf } from '$lib/domain/calendar';

	/**
	 * 月の選択（SPEC.md §4.4）。直近の月から降順に並べる。
	 *
	 * 新規作成もここに置く（SPEC.md §6）。存在しない月へ移動すると、その画面に
	 * 作成の導線が出る。
	 */
	interface Props {
		current: string;
		months: string[];
		/** 月を離れる前に未保存の変更を書き出す */
		beforeLeave: () => Promise<void>;
	}

	let { current, months, beforeLeave }: Props = $props();

	// 表示中の月がファイル未作成でも選べるようにしておく
	const options = $derived([...new Set([current, ...months])].sort().reverse());

	async function move(month: string) {
		if (month === current) return;
		await beforeLeave();
		await goto(resolve('/[month=month]', { month }));
	}

	async function createNew() {
		const suggested = monthStringOf(new Date());
		const input = prompt('作成する年月を YYYY-MM で入力してください', suggested);
		if (input === null) return;
		if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input)) {
			alert('YYYY-MM の形式で入力してください');
			return;
		}
		await move(input);
	}
</script>

<div class="selector">
	<select aria-label="対象の月" value={current} onchange={(e) => move(e.currentTarget.value)}>
		{#each options as month (month)}
			<option value={month}>{month}</option>
		{/each}
	</select>
	<button onclick={createNew}>別の月を開く</button>
</div>

<style>
	.selector {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}

	select {
		padding: 0.2rem 0.4rem;
		font-size: 0.95rem;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	button {
		padding: 0.2rem 0.55rem;
		border-color: transparent;
		color: var(--fg-muted);
		font-size: 0.78rem;
	}

	button:hover {
		border-color: var(--line-strong);
	}
</style>
