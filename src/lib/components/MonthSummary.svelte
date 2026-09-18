<script lang="ts">
	import { DAY_TYPE_LABEL } from '$lib/domain/defaults';
	import type { MonthSummary } from '$lib/domain/summary';
	import { formatDuration, formatSignedDuration } from '$lib/domain/time';
	import type { ContractSnapshot, NonWorkDayType } from '$lib/domain/types';
	import SettlementBar from './SettlementBar.svelte';

	/**
	 * 月次サマリ（SPEC.md §5.2）。画面上部に常時表示し、入力に応じて即座に更新する。
	 *
	 * 警告は出さない。実績・着地見込み・精算幅の関係を帯で示し、下限割れや超過見込み
	 * は読み手が見て判断する。
	 */
	interface Props {
		summary: MonthSummary;
		contract: ContractSnapshot;
	}

	let { summary, contract }: Props = $props();

	// 土日は日数が自明なので内訳に出さない。祝日・私用休の別が知りたい（SPEC.md §4.2）
	const breakdown = $derived(
		(Object.entries(summary.breakdown) as [NonWorkDayType, number][]).filter(
			([type, n]) => n > 0 && type !== 'weekend'
		)
	);
</script>

<section class="summary" aria-label="月次サマリ">
	<div class="headline">
		<p class="actual tnum">{formatDuration(summary.actualMinutes)}</p>
		<p class="against tnum">
			想定 {formatDuration(summary.plannedMinutes)}<span class="days">（{summary.plannedDays}日）</span>
		</p>
	</div>

	<SettlementBar
		actual={summary.actualMinutes}
		projected={summary.projectedMinutes}
		lower={contract.lowerHours * 60}
		upper={contract.upperHours * 60}
	/>

	<dl class="stats">
		<div>
			<dt>ペース差分</dt>
			<dd class="tnum" class:behind={summary.paceMinutes < 0}>
				{formatSignedDuration(summary.paceMinutes)}
			</dd>
		</div>
		<div>
			<dt>下限まであと</dt>
			<dd class="tnum">
				{summary.toLowerMinutes > 0 ? formatDuration(summary.toLowerMinutes) : '到達'}
			</dd>
		</div>
		<div>
			<dt>上限まであと</dt>
			<dd class="tnum">
				{summary.toUpperMinutes > 0
					? formatDuration(summary.toUpperMinutes)
					: `${formatDuration(summary.overMinutes)} 超過`}
			</dd>
		</div>
		{#if breakdown.length > 0}
			<div>
				<dt>休み</dt>
				<dd>
					{#each breakdown as [type, n], i (type)}{i > 0 ? '・' : ''}{DAY_TYPE_LABEL[type]}{n}日{/each}
				</dd>
			</div>
		{/if}
	</dl>
</section>

<style>
	.summary {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0.6rem 2rem;
		padding: 0.7rem 1.25rem 0.6rem;
		border-bottom: 1px solid var(--line);
		background: var(--surface);
	}

	.stats {
		flex: none;
	}

	.headline {
		display: flex;
		flex-direction: column;
		flex: none;
	}

	.actual {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 650;
		letter-spacing: -0.01em;
		line-height: 1.1;
	}

	.against {
		margin: 0.1rem 0 0;
		color: var(--fg-muted);
		font-size: 0.78rem;
	}

	.days {
		color: var(--fg-subtle);
	}

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1.4rem;
		margin: 0;
		padding-left: 2rem;
		border-left: 1px solid var(--line);
	}

	.stats dt {
		color: var(--fg-muted);
		font-size: 0.72rem;
		white-space: nowrap;
	}

	.stats dd {
		margin: 0.05rem 0 0;
		font-size: 0.95rem;
		white-space: nowrap;
	}

	/* 借金側は少しだけ弱める。色で警告はしない（SPEC.md §5.2） */
	.behind {
		color: var(--fg-muted);
	}
</style>
