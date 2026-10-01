import type { DateString, Minutes, MonthData, NonWorkDayType } from './types';
import { dailyWorkMinutes } from './workday';

/** 月次集計（SPEC.md §5.2）。単位はすべて分 */
export interface MonthSummary {
	/** dayType が work の日数 */
	plannedDays: number;
	/** 稼働予定日数 × dailyHours */
	plannedMinutes: Minutes;
	/** 各日の稼働時間の合計 */
	actualMinutes: Minutes;
	/** 実績 −（本日までの稼働予定日数 × dailyHours）。貯金か借金か */
	paceMinutes: Minutes;
	/** 実績 +（本日より後の稼働予定日数 × dailyHours）。このまま働いた場合の月末 */
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
 * `today` を引数で受けるのは、内部で new Date() を呼ぶとテストが実行日に依存する
 * ため。「本日まで」は当日を含む（SPEC.md §5.2）。表示中の月が過去なら全日が
 * 「本日まで」に入り、未来なら 0 日になる。
 */
export function summarize(month: MonthData, today: DateString): MonthSummary {
	const dailyMinutes = month.contract.dailyHours * 60;
	const lowerMinutes = month.contract.lowerHours * 60;
	const upperMinutes = month.contract.upperHours * 60;

	let plannedDays = 0;
	let plannedDaysUntilToday = 0;
	let actualMinutes = 0;
	const breakdown: Record<NonWorkDayType, number> = {
		weekend: 0,
		holiday: 0,
		personal: 0,
		clientClosed: 0
	};

	for (const day of month.days) {
		if (day.dayType === 'work') {
			plannedDays++;
			if (day.date <= today) plannedDaysUntilToday++;
		} else {
			breakdown[day.dayType]++;
		}
		actualMinutes += dailyWorkMinutes(day) ?? 0;
	}

	const plannedMinutes = plannedDays * dailyMinutes;
	const remainingPlannedDays = plannedDays - plannedDaysUntilToday;

	return {
		plannedDays,
		plannedMinutes,
		actualMinutes,
		paceMinutes: actualMinutes - plannedDaysUntilToday * dailyMinutes,
		projectedMinutes: actualMinutes + remainingPlannedDays * dailyMinutes,
		toLowerMinutes: lowerMinutes - actualMinutes,
		toUpperMinutes: upperMinutes - actualMinutes,
		overMinutes: Math.max(0, actualMinutes - upperMinutes),
		shortMinutes: Math.max(0, lowerMinutes - actualMinutes),
		breakdown
	};
}
