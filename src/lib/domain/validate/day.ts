import { breakTotal, overlappingIndexes } from '../breaks';
import { toMinutes } from '../time';
import type { DayRecord, TimeString } from '../types';
import { issue, type Issue } from './issue';

/** 作業内容の上限。守れば印字幅に収まり、31 行 1 ページの制約が確定する（SPEC.md §4.2） */
export const WORK_CONTENT_MAX = 30;

/** 全角半角を区別せず数える（SPEC.md §4.2）。サロゲートペアは 1 文字とする */
export function contentLength(text: string): number {
	return [...text].length;
}

/**
 * 稼働入力の検証（SPEC.md §8）。
 *
 * maxEndTime は契約設定の値なので引数で受ける。日次データの中だけでは終了時刻の
 * 上限を判断できない。
 */
export function validateDay(day: DayRecord, maxEndTime: TimeString): Issue[] {
	const issues: Issue[] = [];
	const at = (extra: { breakIndex?: number; field?: string } = {}) => ({ date: day.date, ...extra });

	if (contentLength(day.workContent) > WORK_CONTENT_MAX) {
		issues.push(
			issue('workContentTooLong', at({ field: 'workContent' }), {
				max: WORK_CONTENT_MAX,
				actual: contentLength(day.workContent)
			})
		);
	}

	if (day.startTime !== null && toMinutes(day.startTime) >= 24 * 60) {
		issues.push(issue('startTimeOutOfRange', at({ field: 'startTime' })));
	}

	if (day.endTime !== null) {
		const end = toMinutes(day.endTime);
		if (end > toMinutes(maxEndTime)) {
			issues.push(issue('endTimeOverMax', at({ field: 'endTime' }), { max: maxEndTime }));
		}
		// 同時刻を許すと稼働時間 0 分の日が成立し、休憩のルールと両立しない（SPEC.md §8）
		if (day.startTime !== null && end <= toMinutes(day.startTime)) {
			issues.push(issue('endTimeBeforeStart', at({ field: 'endTime' })));
		}
	}

	issues.push(...validateBreaks(day));
	return issues;
}

function validateBreaks(day: DayRecord): Issue[] {
	if (day.breaks.length === 0) return [];
	const at = (extra: { breakIndex?: number; field?: string } = {}) => ({ date: day.date, ...extra });

	// 稼働時間帯が定まらない日に休憩は置けない。入力済みの休憩は消さず警告にとどめる
	// （SPEC.md §6.1）
	if (day.startTime === null || day.endTime === null) {
		return [issue('breakWithoutWorkTime', at({ field: 'breaks' }))];
	}

	const issues: Issue[] = [];
	const start = toMinutes(day.startTime);
	const end = toMinutes(day.endTime);

	day.breaks.forEach((b, breakIndex) => {
		const from = toMinutes(b.start);
		const to = toMinutes(b.end);
		if (from >= to) {
			issues.push(issue('breakZeroLength', at({ breakIndex })));
			return;
		}
		// 端に接する区間（始業直後・終業直前）は許容する（SPEC.md §8）
		if (from < start || to > end) {
			issues.push(issue('breakOutsideWork', at({ breakIndex })));
		}
	});

	for (const breakIndex of overlappingIndexes(day.breaks)) {
		issues.push(issue('breakOverlap', at({ breakIndex })));
	}

	if (breakTotal(day.breaks) >= end - start) {
		issues.push(issue('breakTotalTooLong', at({ field: 'breaks' })));
	}

	return issues;
}
