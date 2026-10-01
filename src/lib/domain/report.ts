import { weekdayLabel } from './calendar';
import { summarize, workedDays } from './summary';
import { formatDuration, toReportTime } from './time';
import type { DateString, MonthData } from './types';
import { dayTimes } from './workday';

/**
 * 報告書のビューモデル（SPEC.md §7.1）。
 *
 * 翌日表記への変換・空欄の判定・数値の書式をここで済ませ、Svelte 側は並べるだけ
 * にする。テンプレートに条件分岐が散ると、印刷レイアウトの調整時に何が出ている
 * のか追えなくなる。
 */

export interface ReportRow {
	date: DateString;
	/** 日付の表示。`1` のように日だけ */
	day: string;
	weekday: string;
	isWeekend: boolean;
	/** 稼働しない日は空文字 */
	start: string;
	end: string;
	breakTime: string;
	workTime: string;
	workContent: string;
}

export interface ReportModel {
	title: string;
	/** 対象期間。`2026年9月1日 〜 2026年9月30日` */
	period: string;
	workerName: string;
	clientName: string;
	rows: ReportRow[];
	footer: {
		workedDays: number;
		totalWorkTime: string;
		settlementRange: string;
		/** 超過・不足。どちらでもなければ「なし」 */
		difference: string;
		/** 空のときは欄ごと出さない（SPEC.md §7.1） */
		remarks: string;
	};
}

export function buildReport(month: MonthData): ReportModel {
	// 報告書が使うのは実績・超過・不足だけで、いずれも「本日」に依存しない。ペース
	// 差分と着地見込みは画面のサマリ専用（SPEC.md §5.2）。末日を渡すのは、月が閉じた
	// 状態として集計するという意味
	const summary = summarize(month, month.days.at(-1)!.date);
	const [year, mon] = month.month.split('-').map(Number);
	const lastDay = month.days.length;

	return {
		title: '作業報告書',
		period: `${year}年${mon}月1日 〜 ${year}年${mon}月${lastDay}日`,
		workerName: month.contract.workerName,
		clientName: month.contract.clientName,
		rows: month.days.map(buildRow),
		footer: {
			workedDays: workedDays(month),
			totalWorkTime: formatDuration(summary.actualMinutes),
			settlementRange: `${month.contract.lowerHours}〜${month.contract.upperHours}h`,
			difference: formatDifference(summary.overMinutes, summary.shortMinutes),
			remarks: month.remarks
		}
	};
}

function buildRow(day: MonthData['days'][number]): ReportRow {
	const weekday = weekdayLabel(day.date);
	// 開始・終了・休憩・稼働時間は稼働区間からの導出値。区間そのものは列挙しない
	const times = dayTimes(day);

	return {
		date: day.date,
		day: String(Number(day.date.slice(-2))),
		weekday,
		isWeekend: weekday === '土' || weekday === '日',
		// 24 時超えは翌日表記へ変換する。開始時刻は 0:00〜23:59 に限られるため対象外
		start: times?.start ?? '',
		end: times === null ? '' : toReportTime(times.end),
		// 休憩がない日は空欄にする（SPEC.md §7.1）
		breakTime: times?.breakMinutes == null ? '' : formatDuration(times.breakMinutes),
		workTime: times === null ? '' : formatDuration(times.workMinutes),
		workContent: day.workContent
	};
}

function formatDifference(over: number, short: number): string {
	if (over > 0) return `${formatDuration(over)} 超過`;
	if (short > 0) return `${formatDuration(short)} 不足`;
	return 'なし';
}
