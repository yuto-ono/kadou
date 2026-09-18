<script lang="ts">
	import { onMount } from 'svelte';
	import { formatDuration } from '$lib/domain/time';
	import { ContractStore } from '$lib/state/contract.svelte';
	import { MonthStore } from '$lib/state/month.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const contract = new ContractStore();
	let store = $state<MonthStore | null>(null);

	onMount(async () => {
		await contract.load();
		const s = new MonthStore(data.month, () => contract.contract?.maxEndTime ?? '28:00');
		await s.load();
		store = s;
	});
</script>

<h1>{data.month}</h1>

{#if store === null}
	<p>読み込み中…</p>
{:else if store.state === 'missing'}
	<p>この月はまだ作成されていません。</p>
	<button
		disabled={!contract.canCreateMonth}
		onclick={() => contract.contract && store?.create(contract.contract)}
	>
		この月を作成する
	</button>
{:else if store.state === 'error'}
	<p>読み込めませんでした: {store.loadError}</p>
{:else if store.data}
	<p>
		実績 {formatDuration(store.summary?.actualMinutes ?? 0)} / 稼働予定 {store.summary?.plannedDays}日
		{store.unsaved ? '（未保存）' : ''}
	</p>
	<table>
		<tbody>
			{#each store.data.days as day (day.date)}
				<tr>
					<td>{day.date}</td>
					<td>{day.dayType}</td>
					<td>
						<input
							value={day.startTime ?? ''}
							oninput={(e) =>
								store?.updateDay(day.date, { startTime: e.currentTarget.value || null })}
						/>
					</td>
					<td>
						<input
							value={day.endTime ?? ''}
							oninput={(e) => store?.updateDay(day.date, { endTime: e.currentTarget.value || null })}
						/>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
