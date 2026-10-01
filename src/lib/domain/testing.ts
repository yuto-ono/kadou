import { emptyDay } from './calendar';
import type { DayRecord } from './types';

/** テスト用の日次レコード生成。本体からは import しない */
export function day(date: string, patch: Partial<DayRecord> = {}): DayRecord {
	return { ...emptyDay(date), ...patch };
}

/** `workDay('2026-09-01', ['09:30', '12:00'], ['13:00', '19:00'])` */
export function workDay(date: string, ...periods: [string, string][]): DayRecord {
	return day(date, {
		dayType: 'work',
		workPeriods: periods.map(([start, end]) => ({ start, end }))
	});
}
