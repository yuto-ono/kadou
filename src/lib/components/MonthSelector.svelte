<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { monthLabel, monthStringOf, shiftMonth } from '$lib/domain/calendar';

	/**
	 * 月の選択（SPEC.md §4.4）。直近の月から降順に並べる。
	 *
	 * 新規作成もここに置く（SPEC.md §6）。存在しない月へ移動すると、その画面に
	 * 作成の導線が出る。
	 *
	 * 前月・翌月は暦の上で隣の月へ移る。作成済みの月だけを辿ると、抜けている月を
	 * 飛び越えて気付けない（SPEC.md §4.4）。
	 *
	 * 表示中の月は画面の見出しを兼ねるので、入力欄ではなく見出しとして大きく見せる。
	 * 透明にした select を重ねて、クリックすれば月の一覧が開くようにしてある。
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

{#snippet chevron(points: string)}
	<svg viewBox="0 0 16 16" aria-hidden="true">
		<polyline {points} />
	</svg>
{/snippet}

<div class="selector">
	<button class="step" aria-label="前月" title="前月" onclick={() => move(shiftMonth(current, -1))}>
		{@render chevron('10,3 5,8 10,13')}
	</button>
	<div class="current">
		<h1>{monthLabel(current)}</h1>
		<svg class="caret" viewBox="0 0 16 16" aria-hidden="true">
			<polyline points="4,6 8,10 12,6" />
		</svg>
		<select aria-label="対象の月" value={current} onchange={(e) => move(e.currentTarget.value)}>
			{#each options as month (month)}
				<option value={month}>{monthLabel(month)}</option>
			{/each}
		</select>
	</div>
	<button class="step" aria-label="翌月" title="翌月" onclick={() => move(shiftMonth(current, 1))}>
		{@render chevron('6,3 11,8 6,13')}
	</button>
	<button class="open" onclick={createNew}>別の月を開く</button>
</div>

<style>
	.selector {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}

	.current {
		position: relative;
		display: flex;
		gap: 0.2rem;
		align-items: center;
		padding: 0.1rem 0.3rem 0.1rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 6px;
		cursor: pointer;
	}

	.current:hover,
	.current:focus-within {
		border-color: var(--line-strong);
	}

	h1 {
		/* 「2026年12月」が収まる幅で固定する。月で幅が変わると、前月・翌月ボタンを
		   続けて押すうちにボタンの位置がずれる */
		min-width: 6.4em;
		margin: 0;
		font-size: 1.5rem;
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		line-height: 1.3;
	}

	.caret {
		color: var(--fg-muted);
		opacity: 0;
	}

	.current:hover .caret,
	.current:focus-within .caret {
		opacity: 1;
	}

	select {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.step {
		display: grid;
		place-items: center;
		padding: 0.25rem 0.4rem;
	}

	svg {
		width: 1rem;
		height: 1rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.open {
		/* 前月・翌月の操作とは別の操作なので、間を空けて区切る */
		margin-left: 1rem;
		padding: 0.2rem 0.55rem;
		border-color: transparent;
		color: var(--fg-muted);
		font-size: 0.78rem;
	}

	.open:hover {
		border-color: var(--line-strong);
	}
</style>
