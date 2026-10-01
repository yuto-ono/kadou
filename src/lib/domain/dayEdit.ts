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
	return day.workPeriods.length > 0;
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
			: { ...day, workPeriods: [] };

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
 * 空欄の作業内容へフォーカスしたときに入れる前回の内容（SPEC.md §6.1「入力補助」）。
 *
 * 対象は作業内容が空欄の稼働日だけ。稼働しない日に入れると、Enter で次の日へ
 * 進むだけで土日にも前回の内容が保存されてしまう。
 *
 * 同じ月の中で当該日より前にあり、手入力された作業内容を持つ最も近い日から取る。
 * 区分変更で自動入力された文言（祝日・休暇・客先休業）は取り出し元にしない。
 * 月はまたがない。該当する日がなければ null。
 */
export function suggestContent(days: DayRecord[], index: number): string | null {
	const target = days[index];
	if (target === undefined || target.dayType !== 'work' || target.workContent !== '') return null;

	for (let i = index - 1; i >= 0; i--) {
		if (days[i].workContent !== '' && !days[i].contentAutoFilled) return days[i].workContent;
	}
	return null;
}
