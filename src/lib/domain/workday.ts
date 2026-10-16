import { periodSpan, periodTotal } from './periods';
import { toMinutes } from './time';
import type { DayRecord, Minutes, TimeString } from './types';

/**
 * 日次の導出値（SPEC.md §5.1）。
 *
 *   稼働時間 = Σ(period.end − period.start)
 *   開始時刻 = 最初の稼働区間の start
 *   終了時刻 = 最後の稼働区間の end
 *   休憩時間 = 終了時刻 − 開始時刻 − 稼働時間
 *
 * 一覧と報告書が同じ規則で求めるよう、ここだけで算出する。丸めは行わない。
 */
export interface DayTimes {
	start: TimeString;
	end: TimeString;
	workMinutes: Minutes;
	breakMinutes: Minutes;
}

/** 稼働区間がない日は null。「未入力」と「0 分」を区別する */
export function dayTimes(day: DayRecord): DayTimes | null {
	const span = periodSpan(day.workPeriods);
	if (span === null) return null;

	const workMinutes = periodTotal(day.workPeriods);
	// 区間が重なっていると稼働時間を二重に数え、差が負になる。重なりは検証で
	// エラーにするので、ここでは 0 分に倒す
	const gap = toMinutes(span.end) - toMinutes(span.start) - workMinutes;
	return { ...span, workMinutes, breakMinutes: Math.max(gap, 0) };
}

/**
 * 日次稼働時間。稼働区間がない日は null。
 *
 * 区分は見ない。区分変更時のクリア（SPEC.md §6.1）があるため通常は起こらないが、
 * YAML を手で編集すれば休日に区間が残りうる。集計から黙って落とすと、画面の
 * 合計とファイルの中身が食い違う。
 */
export function dailyWorkMinutes(day: DayRecord): Minutes | null {
	return dayTimes(day)?.workMinutes ?? null;
}
