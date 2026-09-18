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
				<dt>対象期間</dt>
				<dd>{report.period}</dd>
				<dt>氏名</dt>
				<dd>{report.workerName}</dd>
				<dt>案件名</dt>
				<dd>{report.projectName}</dd>
				<dt>客先</dt>
				<dd>{report.clientName}</dd>
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
				<th>作業内容</th>
			</tr>
		</thead>
		<tbody>
			<!-- 1 日〜末日の全日を出す。休んだ日と稼働がなかった日を区別するため -->
			{#each report.rows as row (row.date)}
				<tr class:weekend={row.isWeekend}>
					<td class="num">{row.day}</td>
					<td class="center">{row.weekday}</td>
					<td class="center">{row.start}</td>
					<td class="center">{row.end}</td>
					<td class="num">{row.breakTime}</td>
					<td class="num">{row.workTime}</td>
					<td>{row.workContent}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<footer class="sheet-footer">
		<dl class="totals">
			<div><dt>稼働日数</dt><dd>{report.footer.workedDays}日</dd></div>
			<div><dt>合計稼働時間</dt><dd>{report.footer.totalWorkTime}</dd></div>
			<div><dt>精算幅</dt><dd>{report.footer.settlementRange}</dd></div>
			<div><dt>超過・不足</dt><dd>{report.footer.difference}</dd></div>
		</dl>

		<!-- 空のときは欄ごと省略する（SPEC.md §7.1） -->
		{#if report.footer.remarks !== ''}
			<div class="remarks">
				<p class="remarks-label">特記事項</p>
				<div class="remarks-body">{report.footer.remarks}</div>
			</div>
		{/if}
	</footer>
</div>
