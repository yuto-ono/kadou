<script lang="ts">
	import { formatDuration } from '$lib/domain/time';
	import type { Minutes } from '$lib/domain/types';

	/**
	 * 精算幅に対する位置（SPEC.md §5.2）。
	 *
	 * 実績・着地見込み・精算幅は数値でも並べているが、三者の関係を読むには引き算が
	 * 要る。このアプリの目的は「このままのペースで精算幅に収まるか」を把握すること
	 * なので（SPEC.md §1）、その 1 問に図で答える。
	 *
	 * 色で警告はしない（SPEC.md §5.2）。帯のどこに実績と着地が来るかだけを示し、
	 * 足りているかの判断は読み手に委ねる。
	 */
	interface Props {
		actual: Minutes;
		projected: Minutes;
		lower: Minutes;
		upper: Minutes;
	}

	let { actual, projected, lower, upper }: Props = $props();

	// 上限より右にも目盛りを残す。超過したときに軸の外へ出て見えなくなるのを防ぐ
	const max = $derived(Math.max(upper, actual, projected) * 1.08);
	const pct = $derived((v: Minutes) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`);
</script>

<div class="bar">
	<div class="track">
		<!-- 精算幅の帯 -->
		<div class="band" style:left={pct(lower)} style:right="calc(100% - {pct(upper)})"></div>
		<!-- 実績 -->
		<div class="actual" style:width={pct(actual)}></div>
		<!-- 着地見込み。実績より先の部分を控えめに伸ばす -->
		{#if projected > actual}
			<div
				class="projected"
				style:left={pct(actual)}
				style:right="calc(100% - {pct(projected)})"
			></div>
		{/if}
		<div class="tick" style:left={pct(projected)}></div>
	</div>

	<div class="scale tnum">
		<span style:left={pct(lower)}>{Math.round(lower / 60)}</span>
		<span style:left={pct(upper)}>{Math.round(upper / 60)}</span>
	</div>

	<p class="legend">
		<span class="key actual-key"></span>実績 {formatDuration(actual)}
		<span class="key projected-key"></span>着地見込み {formatDuration(projected)}
		<span class="key band-key"></span>精算幅
	</p>
</div>

<style>
	.bar {
		flex: 1;
		min-width: 15rem;
		max-width: 26rem;
	}

	.track {
		position: relative;
		height: 0.7rem;
		border-radius: 3px;
		background: var(--surface-sunken);
		box-shadow: inset 0 0 0 1px var(--line);
	}

	.band {
		position: absolute;
		top: 0;
		bottom: 0;
		border-right: 1px solid var(--accent);
		border-left: 1px solid var(--accent);
		background: var(--accent-soft);
	}

	.actual {
		position: absolute;
		top: 0;
		bottom: 0;
		border-radius: 3px 0 0 3px;
		background: var(--accent);
	}

	.projected {
		position: absolute;
		top: 0;
		bottom: 0;
		background: repeating-linear-gradient(
			135deg,
			var(--accent) 0 2px,
			transparent 2px 5px
		);
		opacity: 0.55;
	}

	.tick {
		position: absolute;
		top: -3px;
		bottom: -3px;
		width: 2px;
		background: var(--accent-strong);
	}

	.scale {
		position: relative;
		height: 1rem;
		color: var(--fg-muted);
		font-size: 0.7rem;
	}

	.scale span {
		position: absolute;
		transform: translateX(-50%);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.15rem 0.5rem;
		margin: 0;
		color: var(--fg-muted);
		font-size: 0.72rem;
	}

	.key {
		width: 0.7rem;
		height: 0.55rem;
		border-radius: 2px;
	}

	.key:not(:first-child) {
		margin-left: 0.35rem;
	}

	.actual-key {
		background: var(--accent);
	}

	.projected-key {
		background: repeating-linear-gradient(135deg, var(--accent) 0 2px, transparent 2px 5px);
		opacity: 0.55;
	}

	.band-key {
		border: 1px solid var(--accent);
		background: var(--accent-soft);
	}
</style>
