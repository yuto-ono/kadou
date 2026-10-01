import { WORK_CONTENT_MAX } from './validate/day';
import type { Issue } from './validate/issue';

/**
 * Issue の日本語化。
 *
 * 検証（validate/）が code と params を返し、文言はここだけが持つ。表示文言を
 * 変えてもドメインのテストが壊れないようにするため。
 */
const TEMPLATES: Record<Issue['code'], (p: Record<string, string | number>) => string> = {
	periodStartOutOfRange: () => '最初の区間の開始は 0:00〜23:59 で入力してください',
	periodEndNotAfterStart: () => '終了は開始より後にしてください',
	periodEndOverMax: (p) => `終了時刻は ${p.max} までです`,
	periodOverlap: () => '区間が重なっています',
	workContentTooLong: (p) => `作業内容は ${p.max ?? WORK_CONTENT_MAX} 文字以内です`,
	contractNameEmpty: () => '空にできません',
	contractRangeInverted: () => '精算幅の下限が上限を超えています',
	contractDailyHoursNotPositive: () => '1 日の想定稼働時間は 0 より大きくしてください',
	contractMaxEndTimeOutOfRange: () => '終了時刻の上限は 24:00〜47:59 で設定してください',
	fileMonthMismatch: (p) => `ファイル名と month（${p.month}）が一致しません`,
	fileUnknownDate: (p) => `この月に属さない日付を読み飛ばしました: ${p.date}`,
	fileDuplicateDate: (p) => `同じ日付が複数あります: ${p.date}`,
	fileFieldDropped: (p) => `${p.field} の値を解釈できず、既定値に戻しました`,
	fileLegacyField: (p) =>
		`旧形式の ${p.field} は読み込みません。workPeriods へ変換してください`
};

export function messageOf(issue: Issue): string {
	return TEMPLATES[issue.code](issue.params ?? {});
}
