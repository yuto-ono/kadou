import { toMinutes } from './time';
import type { Minutes, TimeString, WorkPeriod } from './types';

/**
 * 稼働区間（SPEC.md §4.3）。
 *
 * 区間を分数ではなく時刻で持つのは、分数への変換が不可逆だから。区間から合計
 * 分数は導けるが、逆は導けない。
 */

/** `start` の昇順。並べ替えのタイミングは SPEC.md §4.3 を参照 */
export function sortPeriods(periods: WorkPeriod[]): WorkPeriod[] {
	return [...periods].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

/** 区間の長さの総和。日次の稼働時間そのもの（SPEC.md §5.1） */
export function periodTotal(periods: WorkPeriod[]): Minutes {
	return periods.reduce((sum, p) => sum + (toMinutes(p.end) - toMinutes(p.start)), 0);
}

/**
 * 最も早い開始と最も遅い終了。区間がなければ null。
 *
 * 入力の途中では並べ替えない（SPEC.md §4.3）ので、配列の先頭と末尾ではなく
 * 最小・最大を取る。
 */
export function periodSpan(periods: WorkPeriod[]): { start: TimeString; end: TimeString } | null {
	if (periods.length === 0) return null;
	let { start, end } = periods[0];
	for (const p of periods) {
		if (toMinutes(p.start) < toMinutes(start)) start = p.start;
		if (toMinutes(p.end) > toMinutes(end)) end = p.end;
	}
	return { start, end };
}

/**
 * 重なっている区間の添字を返す。
 *
 * 隣接（`09:30`〜`12:00` と `12:00`〜`13:00`）は重なりとせず、結合もしない
 * （SPEC.md §8「稼働区間のルール」）。
 */
export function overlappingIndexes(periods: WorkPeriod[]): number[] {
	const spans = periods.map((p) => ({ start: toMinutes(p.start), end: toMinutes(p.end) }));

	// 1 日の区間数はたかが知れているので総当たりにする。開始時刻で並べて隣どうしを
	// 見る方法だと、区間が別の区間を完全に含む場合（09:00〜18:00 と 13:00〜14:00）を
	// 取りこぼす。
	const hit = new Set<number>();
	for (let i = 0; i < spans.length; i++) {
		for (let j = i + 1; j < spans.length; j++) {
			if (spans[i].start < spans[j].end && spans[j].start < spans[i].end) {
				hit.add(i);
				hit.add(j);
			}
		}
	}
	return [...hit].sort((a, b) => a - b);
}
