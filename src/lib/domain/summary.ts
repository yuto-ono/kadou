import type { Minutes, MonthData, NonWorkDayType } from './types';
import { dailyWorkMinutes } from './workday';

/** 月次集計（SPEC.md §5.2）。単位はすべて分 */
export interface MonthSummary {
	/** dayType が work の日数 */
	plannedDays: number;
	/** 稼働予定日数 × dailyHours */
	plannedMinutes: Minutes;
	/** 各日の稼働時間の合計 */
	actualMinutes: Minutes;
	/** 実績 −（入力済みの稼働予定日数 × dailyHours）。入力した範囲での貯金か借金か */
	paceMinutes: Minutes;
	/** 実績 +（未入力の稼働予定日数 × dailyHours）。残りを想定どおり働いた場合の月末 */
	projectedMinutes: Minutes;
	/** 下限・上限まであと何分か。超えていれば負になる */
	toLowerMinutes: Minutes;
	toUpperMinutes: Minutes;
	/** 精算幅からのはみ出し。どちらも 0 以上 */
	overMinutes: Minutes;
	shortMinutes: Minutes;
	/** 休みの内訳。画面の月次サマリにのみ表示し、報告書には出さない（SPEC.md §4.2） */
	breakdown: Record<NonWorkDayType, number>;
}

/**
 * 月次集計。
 *
 * ペース差分と着地見込みは、日付ではなく入力済みかどうか（稼働区間の有無）で
 * 稼働予定日を分ける（SPEC.md §5.2）。数日分まとめて入力しても、未入力の日が
 * 見込みから抜け落ちない。
 */
export function summarize(month: MonthData): MonthSummary {
	const dailyMinutes = month.contract.dailyHours * 60;
	const lowerMinutes = month.contract.lowerHours * 60;
	const upperMinutes = month.contract.upperHours * 60;

	let plannedDays = 0;
	let enteredPlannedDays = 0;
	let actualMinutes = 0;
	const breakdown: Record<NonWorkDayType, number> = {
		weekend: 0,
		holiday: 0,
		personal: 0,
		clientClosed: 0
	};

	for (const day of month.days) {
		const minutes = dailyWorkMinutes(day);
		if (day.dayType === 'work') {
			plannedDays++;
			if (minutes !== null) enteredPlannedDays++;
		} else {
			breakdown[day.dayType]++;
		}
		actualMinutes += minutes ?? 0;
	}

	const plannedMinutes = plannedDays * dailyMinutes;
	const unenteredPlannedDays = plannedDays - enteredPlannedDays;

	return {
		plannedDays,
		plannedMinutes,
		actualMinutes,
		paceMinutes: actualMinutes - enteredPlannedDays * dailyMinutes,
		projectedMinutes: actualMinutes + unenteredPlannedDays * dailyMinutes,
		toLowerMinutes: lowerMinutes - actualMinutes,
		toUpperMinutes: upperMinutes - actualMinutes,
		overMinutes: Math.max(0, actualMinutes - upperMinutes),
		shortMinutes: Math.max(0, lowerMinutes - actualMinutes),
		breakdown
	};
}
