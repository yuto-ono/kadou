<script lang="ts">
	import type { ReportModel } from '$lib/domain/report';

	/** 報告書の 1 ページ（SPEC.md §7.1）。A4 縦 1 ページに収める */
	interface Props {
		report: ReportModel;
	}

	let { report }: Props = $props();
</script>

<div class="sheet">
	<header class="sheet-header">
		<div>
			<h1>{report.title}</h1>
			<dl class="meta">
				<div><dt>対象月</dt><dd>{report.targetMonth}</dd></div>
				<div><dt>氏名</dt><dd>{report.workerName}</dd></div>
			</dl>
		</div>
		<!-- 押印や署名は印刷後に手書きで行う。中身は出力しない（SPEC.md §7.1） -->
		<div class="approval">
			<div class="approval-label">承認確認欄</div>
		</div>
	</header>

	<table class="detail">
		<thead>
			<tr>
				<th class="col-date">日付</th>
				<th class="col-weekday">曜日</th>
				<th class="col-start">開始</th>
				<th class="col-end">終了</th>
				<th class="col-break">休憩</th>
				<th class="col-work">稼働時間</th>
				<th>作業内容・備考</th>
			</tr>
		</thead>
		<tbody>
			<!-- 1 日〜末日の全日を出す。休んだ日と稼働がなかった日を区別するため -->
			{#each report.rows as row (row.date)}
				<tr class:rest={row.isRestDay}>
					<td class="num">{row.day}</td>
					<td class="center">{row.weekday}</td>
					<td class="center">{row.start}</td>
					<td class="center">{row.end}</td>
					<td class="num">{row.breakTime}</td>
					<td class="num worked">{row.workTime}</td>
					<td>{row.workContent}</td>
				</tr>
			{/each}
		</tbody>
		<!-- 合計は稼働時間列の真下に置き、どの列の合計かを位置で示す -->
		<tfoot>
			<tr class="total">
				<th colspan="5">合計稼働時間</th>
				<td class="num"><div class="total-value">{report.footer.totalWorkTime}</div></td>
				<td class="total-blank"></td>
			</tr>
		</tfoot>
	</table>

	<footer class="sheet-footer">
		<!-- 空のときは欄ごと省略する（SPEC.md §7.1） -->
		{#if report.footer.remarks !== ''}
			<div class="remarks">
				<p class="remarks-label">特記事項</p>
				<div class="remarks-body">{report.footer.remarks}</div>
			</div>
		{/if}
	</footer>
</div>
