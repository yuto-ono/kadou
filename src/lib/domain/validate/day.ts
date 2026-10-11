import { overlappingIndexes, sortPeriods } from '../periods';
import { toMinutes } from '../time';
import type { DayRecord, TimeString } from '../types';
import { issue, type Issue } from './issue';

/** 作業内容の上限。守れば印字幅に収まり、31 行 1 ページの制約が確定する（SPEC.md §4.2） */
export const WORK_CONTENT_MAX = 38;

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

	if (contentLength(day.workContent) > WORK_CONTENT_MAX) {
		issues.push(
			issue('workContentTooLong', { date: day.date, field: 'workContent' }, {
				max: WORK_CONTENT_MAX,
				actual: contentLength(day.workContent)
			})
		);
	}

	issues.push(...validatePeriods(day, maxEndTime));
	return issues;
}

/**
 * 稼働区間のルール（SPEC.md §8）。
 *
 * 添字は並べ替える前の配列での位置。入力の途中では並べ替えない（SPEC.md §4.3）
 * ので、UI はこの添字で該当区間の行を引く。
 */
function validatePeriods(day: DayRecord, maxEndTime: TimeString): Issue[] {
	if (day.workPeriods.length === 0) return [];
	const at = (periodIndex: number) => ({ date: day.date, periodIndex });
	const issues: Issue[] = [];

	// 「最も早い区間」は並べた順で判定する。2 件目以降の開始は、並び順・重複・
	// 終了の上限で十分に縛られるので範囲を見ない
	const earliest = day.workPeriods.indexOf(sortPeriods(day.workPeriods)[0]);
	if (toMinutes(day.workPeriods[earliest].start) >= 24 * 60) {
		issues.push(issue('periodStartOutOfRange', at(earliest)));
	}

	day.workPeriods.forEach((p, periodIndex) => {
		// 長さ 0 の区間を認めない。稼働時間 0 分の区間に集計上の意味はない
		if (toMinutes(p.end) <= toMinutes(p.start)) {
			issues.push(issue('periodEndNotAfterStart', at(periodIndex)));
		}
		if (toMinutes(p.end) > toMinutes(maxEndTime)) {
			issues.push(issue('periodEndOverMax', at(periodIndex), { max: maxEndTime }));
		}
	});

	// 重なりは関わる両方の区間に出す（SPEC.md §8）
	for (const periodIndex of overlappingIndexes(day.workPeriods)) {
		issues.push(issue('periodOverlap', at(periodIndex)));
	}

	return issues;
}
