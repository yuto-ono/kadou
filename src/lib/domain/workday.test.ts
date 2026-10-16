import { describe, expect, it } from 'vitest';
import { day, workDay } from './testing';
import { dailyWorkMinutes, dayTimes } from './workday';

describe('dayTimes', () => {
	it('開始・終了・稼働・休憩を稼働区間から導く', () => {
		expect(dayTimes(workDay('2026-09-01', ['09:30', '12:00'], ['13:00', '19:00']))).toEqual({
			start: '09:30',
			end: '19:00',
			workMinutes: 510,
			breakMinutes: 60
		});
	});

	it('空き時間が複数あれば合計する', () => {
		const d = workDay('2026-09-01', ['09:00', '12:00'], ['13:00', '15:00'], ['15:15', '18:00']);
		expect(dayTimes(d)?.breakMinutes).toBe(75);
	});

	it('区間が 1 件なら休憩は 0 分', () => {
		expect(dayTimes(workDay('2026-09-01', ['09:00', '18:00']))?.breakMinutes).toBe(0);
	});

	it('区間がすべて隣接していれば休憩は 0 分', () => {
		expect(dayTimes(workDay('2026-09-01', ['09:00', '12:00'], ['12:00', '18:00']))?.breakMinutes).toBe(0);
	});

	it('並べ替える前でも同じ値になる', () => {
		expect(dayTimes(workDay('2026-09-01', ['13:00', '19:00'], ['09:30', '12:00']))).toMatchObject({
			start: '09:30',
			end: '19:00',
			breakMinutes: 60
		});
	});

	it('24 時超えの区間を同一日の稼働として扱う', () => {
		expect(dayTimes(workDay('2026-09-01', ['13:00', '24:30'], ['25:00', '26:00']))).toEqual({
			start: '13:00',
			end: '26:00',
			workMinutes: 750,
			breakMinutes: 30
		});
	});

	it('区間が重なっていても休憩を負にしない', () => {
		expect(dayTimes(workDay('2026-09-01', ['09:00', '13:00'], ['12:00', '18:00']))?.breakMinutes).toBe(0);
	});

	it('稼働区間がない日は null', () => {
		expect(dayTimes(day('2026-09-01'))).toBeNull();
	});
});

describe('dailyWorkMinutes', () => {
	it('丸めない', () => {
		expect(dailyWorkMinutes(workDay('2026-09-01', ['09:07', '18:13']))).toBe(546);
	});

	it('稼働区間がない日は未入力として null を返す', () => {
		expect(dailyWorkMinutes(day('2026-09-01'))).toBeNull();
	});

	it('区分にかかわらず稼働区間があれば数える', () => {
		// YAML を手で編集すれば休日に区間が残りうる
		const d = day('2026-09-05', { dayType: 'weekend', workPeriods: [{ start: '10:00', end: '15:00' }] });
		expect(dailyWorkMinutes(d)).toBe(300);
	});
});
