import type { DateString } from '../types';

/**
 * 検証結果（SPEC.md §8）。
 *
 * 文言ではなく code と params で返す。ドメインのテストが表示文言の変更で壊れず、
 * 表示先（一覧のセル・詳細パネル・契約設定のエラー欄）ごとに出し分けられるため。
 * 日本語化は messages.ts が担う。
 */

export type IssueCode =
	// 稼働入力（SPEC.md §8）
	| 'periodStartOutOfRange'
	| 'periodEndNotAfterStart'
	| 'periodEndOverMax'
	| 'periodOverlap'
	| 'workContentTooLong'
	// 契約設定（SPEC.md §8）
	| 'contractNameEmpty'
	| 'contractRangeInverted'
	| 'contractDailyHoursNotPositive'
	| 'contractMaxEndTimeOutOfRange'
	// YAML の読み込み（SPEC.md §4.5）
	| 'fileMonthMismatch'
	| 'fileUnknownDate'
	| 'fileDuplicateDate'
	| 'fileFieldDropped'
	| 'fileLegacyField';

/** エラーの発生源。UI が該当箇所へエラーを出すために使う */
export interface IssueTarget {
	date?: DateString;
	/** 稼働区間の添字。並べ替える前の配列での位置 */
	periodIndex?: number;
	/** 契約設定やファイル全体のフィールド名 */
	field?: string;
}

export interface Issue {
	code: IssueCode;
	target: IssueTarget;
	params?: Record<string, string | number>;
}

export function issue(
	code: IssueCode,
	target: IssueTarget = {},
	params?: Record<string, string | number>
): Issue {
	return params ? { code, target, params } : { code, target };
}
