<script lang="ts">
	import { DAY_TYPE_LABEL } from '$lib/domain/defaults';
	import type { MonthSummary } from '$lib/domain/summary';
	import { formatDuration, formatSignedDuration } from '$lib/domain/time';
	import type { ContractSnapshot, NonWorkDayType } from '$lib/domain/types';

	/**
	 * 月次サマリ（SPEC.md §5.2）。画面上部に常時表示し、入力に応じて即座に更新する。
	 *
	 * 警告メッセージは出さない。想定稼働時間・着地見込み・精算幅を並べれば、下限割れ
	 * や超過見込みは数字を見れば分かる。
	 */
	interface Props {
		summary: MonthSummary;
		contract: ContractSnapshot;
	}

	let { summary, contract }: Props = $props();

	const breakdown = $derived(
		(Object.entries(summary.breakdown) as [NonWorkDayType, number][]).filter(
			([type, n]) => n > 0 && type !== 'weekend'
		)
	);
</script>

<section class="summary" aria-label="月次サマリ">
	<dl>
		<div><dt>実績</dt><dd class="lead">{formatDuration(summary.actualMinutes)}</dd></div>
		<div>
			<dt>想定稼働</dt>
			<dd>{formatDuration(summary.plannedMinutes)}<small>（{summary.plannedDays}日）</small></dd>
		</div>
		<div><dt>ペース差分</dt><dd>{formatSignedDuration(summary.paceMinutes)}</dd></div>
		<div><dt>着地見込み</dt><dd>{formatDuration(summary.projectedMinutes)}</dd></div>
		<div><dt>精算幅</dt><dd>{contract.lowerHours}〜{contract.upperHours}h</dd></div>
		<div>
			<dt>下限／上限まで</dt>
			<dd>
				{formatSignedDuration(summary.toLowerMinutes)} / {formatSignedDuration(
					summary.toUpperMinutes
				)}
			</dd>
		</div>
	</dl>

	{#if breakdown.length > 0}
		<!-- 休みの内訳は画面にのみ出す。報告書には載せない（SPEC.md §7.1） -->
		<p class="breakdown">
			休み: {#each breakdown as [type, n], i (type)}{i > 0 ? '・' : ''}{DAY_TYPE_LABEL[
					type
				]}{n}日{/each}
		</p>
	{/if}
</section>

<style>
	.summary {
		padding: 0.6rem 1rem;
		border-bottom: 1px solid var(--border);
		background: var(--bg);
	}

	dl {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.75rem;
		margin: 0;
	}

	dt {
		color: var(--muted);
		font-size: 0.8rem;
	}

	dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
		font-size: 1rem;
	}

	.lead {
		font-size: 1.3rem;
		font-weight: 600;
		line-height: 1.2;
	}

	small {
		margin-left: 0.2rem;
		color: var(--muted);
		font-size: 0.75rem;
	}

	.breakdown {
		margin: 0.4rem 0 0;
		color: var(--muted);
		font-size: 0.8rem;
	}
</style>
