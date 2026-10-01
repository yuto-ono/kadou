import { sortPeriods } from '$lib/domain/periods';
import { datesOfMonth, emptyDay, toSnapshot } from '$lib/domain/calendar';
import { DAY_DEFAULTS } from '$lib/domain/defaults';
import type { DayRecord, MonthData } from '$lib/domain/types';

/**
 * 月次データの正規化。
 *
 * 読み込み経路と書き込み経路の双方が通る。両者で同じ関数を使うことで、
 * 「直列化 → 再パース → 元と一致するか」という自己検証が成立する（SPEC.md §4.5）。
 *
 * ここでやること:
 *   - 1 日〜末日までの全日を揃える（欠けていれば空のレコードを補う）
 *   - 稼働区間を start の昇順へ並べる
 *   - 稼働しない日に稼働区間が残っていても消さない（手編集された値を無言で捨てない）
 */
export function normalizeMonth(data: MonthData): MonthData {
	const byDate = new Map<string, DayRecord>();
	for (const day of data.days) {
		// 同じ日付が複数あれば最初のものを採る。取捨の報告は parse 側の責務
		if (!byDate.has(day.date)) byDate.set(day.date, day);
	}

	return {
		month: data.month,
		days: datesOfMonth(data.month).map((date) => normalizeDay(byDate.get(date) ?? emptyDay(date))),
		contract: toSnapshot(data.contract),
		remarks: data.remarks
	};
}

function normalizeDay(day: DayRecord): DayRecord {
	return {
		...DAY_DEFAULTS,
		...day,
		workPeriods: sortPeriods(day.workPeriods ?? [])
	};
}
