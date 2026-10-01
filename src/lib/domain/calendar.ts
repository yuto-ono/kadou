import { DAY_DEFAULTS } from './defaults';
import type { ContractSnapshot, DateString, DayRecord, MonthData, MonthString } from './types';

/**
 * 月と日付の扱い。
 *
 * Date を使うのは日付の算術（末日・曜日）だけで、内部表現は文字列のまま保つ。
 * すべて UTC で組み立てる。ローカルタイムゾーンを経由すると、実行環境によって
 * 日付が 1 日ずれる。
 */

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** 日曜を 0 とする曜日名（SPEC.md §6.1 の一覧・§7.1 の明細表で使う） */
export const WEEKDAY_LABEL = ['日', '月', '火', '水', '木', '金', '土'] as const;

export function isMonthString(value: unknown): value is MonthString {
	return typeof value === 'string' && MONTH_PATTERN.test(value);
}

export function isDateString(value: unknown): value is DateString {
	if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
	// 2026-02-30 のような、書式は合うが存在しない日を弾く
	return toUtc(value).toISOString().slice(0, 10) === value;
}

function toUtc(date: DateString): Date {
	return new Date(`${date}T00:00:00.000Z`);
}

export function daysInMonth(month: MonthString): number {
	const [y, m] = month.split('-').map(Number);
	return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 日曜 0 〜 土曜 6 */
export function weekdayIndex(date: DateString): number {
	return toUtc(date).getUTCDay();
}

export function weekdayLabel(date: DateString): string {
	return WEEKDAY_LABEL[weekdayIndex(date)];
}

export function isWeekend(date: DateString): boolean {
	const d = weekdayIndex(date);
	return d === 0 || d === 6;
}

export function monthOf(date: DateString): MonthString {
	return date.slice(0, 7);
}

/** 月に属する 1 日〜末日の日付をすべて返す */
export function datesOfMonth(month: MonthString): DateString[] {
	const count = daysInMonth(month);
	return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

/**
 * 1 日分の空のレコードを作る。
 *
 * 土日だけは初期値を weekend にする。祝日・私用休・客先休業は手動指定
 * （SPEC.md §4.2「dayType の意味」）。
 */
export function emptyDay(date: DateString): DayRecord {
	return {
		date,
		dayType: isWeekend(date) ? 'weekend' : 'work',
		...DAY_DEFAULTS,
		workPeriods: []
	};
}

/**
 * 契約条件のスナップショット（SPEC.md §4.4）。
 *
 * フィールドを明示して写す。スプレッドで複製すると、Contract を渡したときに
 * maxEndTime が月へ紛れ込む。maxEndTime は新規入力の検証にのみ作用し、記録済み
 * のデータや出力には影響しないため、スナップショットに含めない。
 */
export function toSnapshot(contract: ContractSnapshot): ContractSnapshot {
	return {
		workerName: contract.workerName,
		clientName: contract.clientName,
		lowerHours: contract.lowerHours,
		upperHours: contract.upperHours,
		dailyHours: contract.dailyHours
	};
}

/** 月の骨組み。1 日〜末日までの全日分を持つ（SPEC.md §4.4） */
export function emptyMonth(month: MonthString, contract: ContractSnapshot): MonthData {
	return {
		month,
		days: datesOfMonth(month).map(emptyDay),
		contract: toSnapshot(contract),
		remarks: ''
	};
}

/** 現在の年月。呼び出し側がテストで固定できるよう、時刻は引数で受ける */
export function monthStringOf(date: Date): MonthString {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** 今日の日付。集計の「本日まで」（SPEC.md §5.2）に渡す */
export function dateStringOf(date: Date): DateString {
	return `${monthStringOf(date)}-${String(date.getDate()).padStart(2, '0')}`;
}
