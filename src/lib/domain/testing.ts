import { emptyDay } from './calendar';
import type { Break, DayRecord } from './types';

/** テスト用の日次レコード生成。本体からは import しない */
export function day(date: string, patch: Partial<DayRecord> = {}): DayRecord {
	return { ...emptyDay(date), ...patch };
}

export function workDay(
	date: string,
	startTime: string,
	endTime: string,
	breaks: Break[] = []
): DayRecord {
	return day(date, { dayType: 'work', startTime, endTime, breaks });
}
