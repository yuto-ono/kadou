import { describe, expect, it } from 'vitest';
import { day, workDay } from './testing';
import { dailyWorkMinutes, isCountedAsWork } from './workday';

describe('dailyWorkMinutes', () => {
	it('終了 − 開始 − 休憩合計', () => {
		expect(dailyWorkMinutes(workDay('2026-09-01', '09:30', '19:00', [{ start: '12:00', end: '13:00' }]))).toBe(510);
	});

	it('休憩なしの日は差だけになる', () => {
		expect(dailyWorkMinutes(workDay('2026-09-01', '09:00', '18:00'))).toBe(540);
	});

	it('24 時超えの終了時刻を同一日の稼働として扱う', () => {
		expect(dailyWorkMinutes(workDay('2026-09-01', '13:00', '26:00'))).toBe(780);
	});

	it('日付をまたいだ位置の休憩を差し引く', () => {
		expect(
			dailyWorkMinutes(workDay('2026-09-01', '13:00', '26:00', [{ start: '25:00', end: '25:30' }]))
		).toBe(750);
	});

	it('丸めない', () => {
		expect(dailyWorkMinutes(workDay('2026-09-01', '09:07', '18:13'))).toBe(546);
	});

	it('時刻が欠けている日は未入力として null を返す', () => {
		expect(dailyWorkMinutes(day('2026-09-01'))).toBeNull();
		expect(dailyWorkMinutes(day('2026-09-01', { startTime: '09:00' }))).toBeNull();
	});
});

describe('isCountedAsWork', () => {
	it('区分にかかわらず時刻が揃っていれば数える', () => {
		// YAML を手で編集すれば休日に時刻が残りうる
		expect(isCountedAsWork(day('2026-09-05', { dayType: 'weekend', startTime: '10:00', endTime: '15:00' }))).toBe(true);
		expect(isCountedAsWork(day('2026-09-05', { dayType: 'weekend' }))).toBe(false);
	});
});
