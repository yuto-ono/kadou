import { toMinutes } from './time';
import type { Break, Minutes } from './types';

/**
 * 休憩区間（SPEC.md §4.3）。
 *
 * 休憩を分数ではなく時刻区間で持つのは、分数への変換が不可逆だから。区間から
 * 合計分数は導けるが、逆は導けない。
 */

/** `start` の昇順。並べ替えのタイミングは SPEC.md §4.3 を参照 */
export function sortBreaks(breaks: Break[]): Break[] {
	return [...breaks].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

/** 休憩合計は入力値ではなく導出値（SPEC.md §4.3） */
export function breakTotal(breaks: Break[]): Minutes {
	return breaks.reduce((sum, b) => sum + (toMinutes(b.end) - toMinutes(b.start)), 0);
}

/**
 * 重なっている区間の添字を返す。
 *
 * 隣接（`12:00`〜`13:00` と `13:00`〜`13:30`）は重なりとせず、結合もしない
 * （SPEC.md §8「休憩区間のルール」）。
 */
export function overlappingIndexes(breaks: Break[]): number[] {
	const spans = breaks.map((b) => ({ start: toMinutes(b.start), end: toMinutes(b.end) }));

	// 1 日の区間数はたかが知れているので総当たりにする。開始時刻で並べて隣どうしを
	// 見る方法だと、区間が別の区間を完全に含む場合（12:00〜18:00 と 13:00〜14:00）を
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
