import { AUTO_CONTENT } from './defaults';
import type { DayRecord, DayType } from './types';

/**
 * 稼働入力の編集規則（SPEC.md §6.1）。
 *
 * 確認モーダルを出すかどうかの判定も純粋関数に出しておく。UI に埋めるとテスト
 * できない。
 */

/**
 * 区分を work から他へ変える際、稼働データを消す確認が要るか（SPEC.md §6.1）。
 *
 * 稼働しない日に稼働時間が残っているのは誤りなのでクリアを既定とするが、手入力
 * した時刻が無言で消えると気付けないため確認を挟む。
 */
export function needsClearConfirm(day: DayRecord, next: DayType): boolean {
	if (day.dayType !== 'work' || next === 'work') return false;
	return day.startTime !== null || day.endTime !== null || day.breaks.length > 0;
}

/**
 * 区分を変更した結果のレコードを返す。
 *
 * 作業内容は確認モーダルの対象に含めず、contentAutoFilled の規則に従う
 * （SPEC.md §6.1）。自動入力は workContent が空欄のときだけ行い、既に何か書かれ
 * ていれば触らない。work に戻したときは、自動入力された文言だけを消す。
 */
export function applyDayTypeChange(day: DayRecord, next: DayType): DayRecord {
	const cleared =
		next === 'work'
			? day
			: { ...day, startTime: null, endTime: null, breaks: [] };

	if (next === 'work') {
		return {
			...cleared,
			dayType: next,
			workContent: day.contentAutoFilled ? '' : day.workContent,
			contentAutoFilled: false
		};
	}

	const auto = AUTO_CONTENT[next];
	const fillable = auto !== '' && (day.workContent === '' || day.contentAutoFilled);
	return {
		...cleared,
		dayType: next,
		workContent: fillable ? auto : day.workContent,
		contentAutoFilled: fillable
	};
}

/**
 * 「前日をコピー」の複製元（SPEC.md §6.1）。
 *
 * 同じ月の中で当該日より前にあり、開始時刻が入力されている最も近い日。月をまたい
 * だ複製は行わない。
 */
export function findPreviousWorkday(days: DayRecord[], index: number): DayRecord | null {
	for (let i = index - 1; i >= 0; i--) {
		if (days[i].startTime !== null) return days[i];
	}
	return null;
}

/**
 * 開始・終了・休憩だけを複製する。
 *
 * 作業内容と journal は複製しない。どちらもその日固有の内容で、複製すると前日の
 * 記述が残ったまま提出される事故につながる（SPEC.md §6.1）。
 */
export function copyWorkTimes(target: DayRecord, source: DayRecord): DayRecord {
	return {
		...target,
		startTime: source.startTime,
		endTime: source.endTime,
		breaks: source.breaks.map((b) => ({ ...b }))
	};
}
