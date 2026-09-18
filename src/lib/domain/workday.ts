import { breakTotal } from './breaks';
import { toMinutes } from './time';
import type { DayRecord, Minutes } from './types';

/**
 * 日次稼働時間（SPEC.md §5.1）。
 *
 *   稼働時間 = 終了時刻 − 開始時刻 − 休憩合計
 *
 * 丸めは行わない。分単位で算出した値をそのまま使う。
 */
export function dailyWorkMinutes(day: DayRecord): Minutes | null {
	// 「未入力」と「0 分」を区別する。0 を返すと一覧で 0:00 と表示され、まだ打って
	// いない日と稼働が 0 分だった日が同じに見える
	if (day.startTime === null || day.endTime === null) return null;
	return toMinutes(day.endTime) - toMinutes(day.startTime) - breakTotal(day.breaks);
}

/**
 * 区分にかかわらず、時刻が入っていれば稼働時間として数える。
 *
 * 区分変更時のクリア（SPEC.md §6.1）があるため通常は起こらないが、YAML を手で
 * 編集すれば休日に時刻が残りうる。集計から黙って落とすと、画面の合計とファイル
 * の中身が食い違う。
 */
export function isCountedAsWork(day: DayRecord): boolean {
	return day.startTime !== null && day.endTime !== null;
}
