import { describe, expect, it } from 'vitest';
import { day, workDay } from '../testing';
import type { DayRecord } from '../types';
import { contentLength, validateDay } from './day';

const codes = (d: DayRecord, maxEndTime = '28:00') => validateDay(d, maxEndTime).map((i) => i.code);

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

describe('稼働区間', () => {
	it('稼働区間がない日は検証しない', () => {
		expect(codes(day('2026-09-01'))).toEqual([]);
	});

	it('終了が開始と同じか前なら違反（長さ 0 を認めない）', () => {
		expect(codes(workDay('2026-09-01', ['09:00', '09:00']))).toContain('periodEndNotAfterStart');
		expect(codes(workDay('2026-09-01', ['18:00', '09:00']))).toContain('periodEndNotAfterStart');
	});

	it('隣接は許容し、重なりは違反', () => {
		expect(codes(workDay('2026-09-01', ['09:00', '12:00'], ['12:00', '18:00']))).toEqual([]);
		expect(codes(workDay('2026-09-01', ['09:00', '13:00'], ['12:30', '18:00']))).toEqual([
			'periodOverlap',
			'periodOverlap'
		]);
	});

	it('重なりは関わる両方の区間に出す', () => {
		const issues = validateDay(workDay('2026-09-01', ['09:00', '13:00'], ['12:30', '18:00']), '28:00');
		expect(issues.map((i) => i.target.periodIndex)).toEqual([0, 1]);
	});

	it('最も早い区間の開始は 0:00〜23:59', () => {
		expect(codes(workDay('2026-09-01', ['23:59', '24:30']))).toEqual([]);
		expect(codes(workDay('2026-09-01', ['24:00', '25:00']))).toEqual(['periodStartOutOfRange']);
	});

	it('2 件目以降の開始には範囲の制約を設けない', () => {
		expect(codes(workDay('2026-09-01', ['13:00', '24:00'], ['25:00', '26:00']))).toEqual([]);
	});

	it('最も早い区間は並べた順で判定する', () => {
		const issues = validateDay(workDay('2026-09-01', ['25:00', '26:00'], ['24:10', '24:50']), '28:00');
		expect(issues).toEqual([
			{ code: 'periodStartOutOfRange', target: { date: '2026-09-01', periodIndex: 1 } }
		]);
	});

	it('すべての区間の終了は maxEndTime 以下', () => {
		expect(codes(workDay('2026-09-01', ['20:00', '28:00']))).toEqual([]);
		expect(codes(workDay('2026-09-01', ['20:00', '28:30']))).toEqual(['periodEndOverMax']);
	});

	it('maxEndTime は引数で受けた値に従う', () => {
		expect(codes(workDay('2026-09-01', ['13:00', '26:00']), '24:00')).toContain('periodEndOverMax');
	});

	it('違反した区間の添字を返す', () => {
		const issues = validateDay(workDay('2026-09-01', ['09:00', '12:00'], ['13:00', '12:30']), '28:00');
		expect(issues[0].target).toEqual({ date: '2026-09-01', periodIndex: 1 });
	});
});
