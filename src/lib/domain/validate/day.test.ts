import { describe, expect, it } from 'vitest';
import { day, workDay } from '../testing';
import type { Break, DayRecord } from '../types';
import { contentLength, validateDay } from './day';

const codes = (d: DayRecord, maxEndTime = '28:00') => validateDay(d, maxEndTime).map((i) => i.code);
const b = (start: string, end: string): Break => ({ start, end });

describe('作業内容', () => {
	it('30 文字までは通す', () => {
		expect(codes(day('2026-09-01', { workContent: 'あ'.repeat(30) }))).toEqual([]);
	});

	it('31 文字で違反', () => {
		expect(codes(day('2026-09-01', { workContent: 'あ'.repeat(31) }))).toContain('workContentTooLong');
	});

	it('全角半角を区別せず数える', () => {
		expect(contentLength('あいうabc')).toBe(6);
		expect(codes(day('2026-09-01', { workContent: 'a'.repeat(31) }))).toContain('workContentTooLong');
	});
});

describe('開始時刻', () => {
	it('0:00〜23:59 の範囲を外れたら違反', () => {
		expect(codes(day('2026-09-01', { startTime: '23:59', endTime: '24:00' }))).toEqual([]);
		expect(codes(day('2026-09-01', { startTime: '24:00', endTime: '25:00' }))).toContain('startTimeOutOfRange');
	});
});

describe('終了時刻', () => {
	it('maxEndTime を超えたら違反', () => {
		expect(codes(workDay('2026-09-01', '09:00', '28:00'))).toEqual([]);
		expect(codes(workDay('2026-09-01', '09:00', '28:30'))).toContain('endTimeOverMax');
	});

	it('maxEndTime は引数で受けた値に従う', () => {
		expect(codes(workDay('2026-09-01', '09:00', '26:00'), '24:00')).toContain('endTimeOverMax');
	});

	it('開始時刻と同じなら違反（稼働 0 分を認めない）', () => {
		expect(codes(workDay('2026-09-01', '09:00', '09:00'))).toContain('endTimeBeforeStart');
	});

	it('開始時刻より前なら違反', () => {
		expect(codes(workDay('2026-09-01', '18:00', '09:00'))).toContain('endTimeBeforeStart');
	});
});

describe('休憩区間', () => {
	it('長さ 0 の区間は認めない', () => {
		expect(codes(workDay('2026-09-01', '09:00', '18:00', [b('12:00', '12:00')]))).toContain('breakZeroLength');
	});

	it('稼働時間帯の外には置けない', () => {
		expect(codes(workDay('2026-09-01', '09:00', '18:00', [b('08:00', '08:30')]))).toContain('breakOutsideWork');
		expect(codes(workDay('2026-09-01', '09:00', '18:00', [b('17:30', '18:30')]))).toContain('breakOutsideWork');
	});

	it('端に接する区間は許容する', () => {
		expect(codes(workDay('2026-09-01', '09:00', '18:00', [b('09:00', '09:30')]))).toEqual([]);
		expect(codes(workDay('2026-09-01', '09:00', '18:00', [b('17:30', '18:00')]))).toEqual([]);
	});

	it('隣接は許容し、重なりは違反', () => {
		expect(codes(workDay('2026-09-01', '09:00', '18:00', [b('12:00', '13:00'), b('13:00', '13:30')]))).toEqual([]);
		expect(codes(workDay('2026-09-01', '09:00', '18:00', [b('12:00', '13:00'), b('12:30', '13:30')]))).toContain('breakOverlap');
	});

	it('休憩合計が稼働時間帯以上なら違反', () => {
		expect(codes(workDay('2026-09-01', '09:00', '10:00', [b('09:00', '10:00')]))).toContain('breakTotalTooLong');
	});

	it('時刻が未入力の日は稼働時間帯が定まらない', () => {
		const d = day('2026-09-01', { breaks: [b('12:00', '13:00')] });
		expect(codes(d)).toEqual(['breakWithoutWorkTime']);
	});

	it('24 時超えの位置の休憩を扱える', () => {
		expect(codes(workDay('2026-09-01', '13:00', '26:00', [b('25:00', '25:30')]))).toEqual([]);
	});

	it('違反した区間の添字を返す', () => {
		const issues = validateDay(workDay('2026-09-01', '09:00', '18:00', [b('12:00', '13:00'), b('08:00', '08:30')]), '28:00');
		expect(issues[0].target).toEqual({ date: '2026-09-01', breakIndex: 1 });
	});
});
