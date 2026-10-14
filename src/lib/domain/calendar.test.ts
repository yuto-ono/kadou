import { describe, expect, it } from 'vitest';
import {
	dateStringOf,
	datesOfMonth,
	daysInMonth,
	emptyDay,
	emptyMonth,
	isDateString,
	isMonthString,
	isWeekend,
	monthLabel,
	monthStringOf,
	shiftMonth,
	weekdayLabel
} from './calendar';
import { CONTRACT_DEFAULTS } from './defaults';

describe('daysInMonth', () => {
	it('月の長さを返す', () => {
		expect(daysInMonth('2026-09')).toBe(30);
		expect(daysInMonth('2026-01')).toBe(31);
		expect(daysInMonth('2026-02')).toBe(28);
		expect(daysInMonth('2028-02')).toBe(29);
	});
});

describe('isDateString', () => {
	it('存在しない日付を弾く', () => {
		expect(isDateString('2026-09-01')).toBe(true);
		expect(isDateString('2026-02-30')).toBe(false);
		expect(isDateString('2026-13-01')).toBe(false);
		expect(isDateString('2026-9-1')).toBe(false);
		expect(isDateString(20260901)).toBe(false);
	});
});

describe('isMonthString', () => {
	it('YYYY-MM だけを通す', () => {
		expect(isMonthString('2026-09')).toBe(true);
		expect(isMonthString('2026-13')).toBe(false);
		expect(isMonthString('2026-9')).toBe(false);
	});
});

describe('曜日', () => {
	it('タイムゾーンに依存せず判定する', () => {
		// 2026-09-01 は火曜、09-05 は土曜、09-06 は日曜
		expect(weekdayLabel('2026-09-01')).toBe('火');
		expect(isWeekend('2026-09-05')).toBe(true);
		expect(isWeekend('2026-09-06')).toBe(true);
		expect(isWeekend('2026-09-07')).toBe(false);
	});
});

describe('datesOfMonth', () => {
	it('1 日から末日まで欠けなく並べる', () => {
		const dates = datesOfMonth('2026-09');
		expect(dates).toHaveLength(30);
		expect(dates[0]).toBe('2026-09-01');
		expect(dates.at(-1)).toBe('2026-09-30');
	});
});

describe('emptyDay', () => {
	it('土日だけ weekend を初期値にする', () => {
		expect(emptyDay('2026-09-05').dayType).toBe('weekend');
		expect(emptyDay('2026-09-07').dayType).toBe('work');
	});

	it('workPeriods は日ごとに別の配列になる', () => {
		const a = emptyDay('2026-09-01');
		const b = emptyDay('2026-09-02');
		a.workPeriods.push({ start: '09:00', end: '18:00' });
		expect(b.workPeriods).toEqual([]);
	});
});

describe('emptyMonth', () => {
	it('全日分を持ち、契約条件を複製する', () => {
		const month = emptyMonth('2026-09', CONTRACT_DEFAULTS);
		expect(month.days).toHaveLength(30);
		expect(month.remarks).toBe('');
		expect(month.contract).not.toBe(CONTRACT_DEFAULTS);
		expect(month.contract.lowerHours).toBe(140);
	});
});

describe('現在時刻からの変換', () => {
	it('ローカル日付をそのまま文字列にする', () => {
		const d = new Date(2026, 8, 3, 23, 30);
		expect(monthStringOf(d)).toBe('2026-09');
		expect(dateStringOf(d)).toBe('2026-09-03');
	});
});

describe('shiftMonth', () => {
	it('暦の上で隣の月を返す', () => {
		expect(shiftMonth('2026-09', -1)).toBe('2026-08');
		expect(shiftMonth('2026-09', 1)).toBe('2026-10');
	});

	it('年をまたぐ', () => {
		expect(shiftMonth('2026-01', -1)).toBe('2025-12');
		expect(shiftMonth('2026-12', 1)).toBe('2027-01');
	});
});

describe('monthLabel', () => {
	it('月を 0 埋めせずに出す', () => {
		expect(monthLabel('2026-09')).toBe('2026年9月');
		expect(monthLabel('2026-10')).toBe('2026年10月');
	});
});
