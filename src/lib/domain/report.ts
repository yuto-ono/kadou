import { weekdayLabel } from './calendar';
import { summarize } from './summary';
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
	/** 土日・祝日。行に色を付けて稼働日と見分ける */
	isRestDay: boolean;
	/** 稼働しない日は空文字 */
	start: string;
	end: string;
	breakTime: string;
	workTime: string;
	workContent: string;
}

export interface ReportModel {
	title: string;
	/** 対象月。`2026年9月` */
	targetMonth: string;
	workerName: string;
	rows: ReportRow[];
	footer: {
		totalWorkTime: string;
		/** 空のときは欄ごと出さない（SPEC.md §7.1） */
		remarks: string;
	};
}

export function buildReport(month: MonthData): ReportModel {
	// 報告書が使うのは実績だけで、「本日」に依存しない。末日を渡すのは、月が閉じた
	// 状態として集計するという意味
	const summary = summarize(month, month.days.at(-1)!.date);
	const [year, mon] = month.month.split('-').map(Number);

	return {
		title: '作業報告書',
		targetMonth: `${year}年${mon}月`,
		workerName: month.contract.workerName,
		rows: month.days.map(buildRow),
		footer: {
			totalWorkTime: formatDuration(summary.actualMinutes),
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
		isRestDay: weekday === '土' || weekday === '日' || day.dayType === 'holiday',
		// 24 時超えは翌日表記へ変換する。開始時刻は 0:00〜23:59 に限られるため対象外
		start: times?.start ?? '',
		end: times === null ? '' : toReportTime(times.end),
		// 休憩がない日は空欄にする（SPEC.md §7.1）
		breakTime: times?.breakMinutes == null ? '' : formatDuration(times.breakMinutes),
		workTime: times === null ? '' : formatDuration(times.workMinutes),
		workContent: day.workContent
	};
}
