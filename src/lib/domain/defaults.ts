import type { Contract, DayRecord, DayType, NonWorkDayType } from './types';

/** 契約設定の既定値（SPEC.md §4.1）。氏名・客先名には既定値がない */
export const CONTRACT_DEFAULTS: Contract = {
	workerName: '',
	clientName: '',
	lowerHours: 140,
	upperHours: 180,
	dailyHours: 8,
	maxEndTime: '28:00'
};

/**
 * 日次レコードの既定値（SPEC.md §4.5）。
 *
 * ファイルへ書き出すとき、この値と一致するフィールドは省略する。date と dayType
 * は既定値を持たず、常に書き出す。
 */
export const DAY_DEFAULTS = {
	workPeriods: [],
	workContent: '',
	journal: '',
	contentAutoFilled: false
} as const satisfies Omit<DayRecord, 'date' | 'dayType'>;

/** 区分変更時に workContent へ自動入力される文言（SPEC.md §6.1） */
export const AUTO_CONTENT: Record<NonWorkDayType, string> = {
	weekend: '',
	holiday: '祝日',
	personal: '休暇',
	clientClosed: '客先休業'
};

/** 画面に表示する区分名（SPEC.md §4.2） */
export const DAY_TYPE_LABEL: Record<DayType, string> = {
	work: '稼働',
	weekend: '土日',
	holiday: '祝日',
	personal: '私用休',
	clientClosed: '客先休業'
};

export const DAY_TYPES = Object.keys(DAY_TYPE_LABEL) as DayType[];
