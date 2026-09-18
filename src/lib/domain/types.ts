/**
 * データモデル（SPEC.md §4）。
 *
 * 単位は分に統一する。SPEC.md §5.2 は lowerHours（時間）と稼働時間（分）が
 * 混在しているが、集計の入口で時間を分へ畳み、以降は Minutes だけを扱う。
 * 時間表記への変換は書式化（time.ts）の責務。
 */

/** 0:00 を 0 とする分。24 時超えは 1440 以上になる */
export type Minutes = number;

/** `HH:MM`。時は 2 桁ゼロ埋めで 00〜47（24 時超え表記を許容、SPEC.md §5.1） */
export type TimeString = string;

/** `YYYY-MM-DD` */
export type DateString = string;

/** `YYYY-MM` */
export type MonthString = string;

/** SPEC.md §4.2「dayType の意味」 */
export type DayType = 'work' | 'weekend' | 'holiday' | 'personal' | 'clientClosed';

/** 稼働予定日にカウントされる区分（SPEC.md §4.2） */
export type NonWorkDayType = Exclude<DayType, 'work'>;

/** 休憩区間（SPEC.md §4.3） */
export interface Break {
	start: TimeString;
	end: TimeString;
}

/** 日次レコード（SPEC.md §4.2） */
export interface DayRecord {
	date: DateString;
	dayType: DayType;
	startTime: TimeString | null;
	endTime: TimeString | null;
	breaks: Break[];
	/** 報告書の明細表に出る。改行なしの 1 行、30 文字以内 */
	workContent: string;
	/** 自分用のメモ。報告書には出力しない */
	journal: string;
	/** workContent が区分変更による自動入力かを示す内部フラグ（SPEC.md §6.1） */
	contentAutoFilled: boolean;
}

/**
 * 月の作成時にコピーする契約条件（SPEC.md §4.4）。
 *
 * maxEndTime を含まないのは、新規入力のバリデーションにのみ作用し、記録済みの
 * データや出力に影響しないため。
 */
export interface ContractSnapshot {
	workerName: string;
	projectName: string;
	clientName: string;
	lowerHours: number;
	upperHours: number;
	dailyHours: number;
}

/** 契約設定（SPEC.md §4.1） */
export interface Contract extends ContractSnapshot {
	maxEndTime: TimeString;
}

/** 月次データ（SPEC.md §4.4） */
export interface MonthData {
	month: MonthString;
	/** 1 日〜末日までの全日分。日付の昇順で欠けがない */
	days: DayRecord[];
	contract: ContractSnapshot;
	/** 月次の特記事項。報告書のフッタに出力する */
	remarks: string;
}
