import { describe, expect, it } from 'vitest';
import { emptyMonth } from './calendar';
import { CONTRACT_DEFAULTS } from './defaults';
import { summarize, workedDays } from './summary';
import type { DayType, MonthData } from './types';

/** 2026-09 は 30 日。平日 22 日、土日 8 日 */
function september(): MonthData {
	return emptyMonth('2026-09', CONTRACT_DEFAULTS);
}

function setDay(month: MonthData, date: string, patch: Partial<MonthData['days'][number]>) {
	const i = month.days.findIndex((d) => d.date === date);
	month.days[i] = { ...month.days[i], ...patch };
}

function setType(month: MonthData, date: string, dayType: DayType) {
	setDay(month, date, { dayType });
}

describe('summarize', () => {
	it('稼働予定日数と想定稼働時間を出す', () => {
		const s = summarize(september(), '2026-09-30');
		expect(s.plannedDays).toBe(22);
		expect(s.plannedMinutes).toBe(22 * 8 * 60);
	});

	it('祝日・私用休は稼働予定日から外れ、内訳に入る', () => {
		const m = september();
		setType(m, '2026-09-21', 'holiday');
		setType(m, '2026-09-22', 'personal');
		setType(m, '2026-09-24', 'clientClosed');
		const s = summarize(m, '2026-09-30');
		expect(s.plannedDays).toBe(19);
		expect(s.breakdown).toEqual({ weekend: 8, holiday: 1, personal: 1, clientClosed: 1 });
	});

	it('土日でも work にすれば稼働予定日に入る', () => {
		const m = september();
		setType(m, '2026-09-05', 'work');
		const s = summarize(m, '2026-09-30');
		expect(s.plannedDays).toBe(23);
		expect(s.breakdown.weekend).toBe(7);
	});

	it('実績は各日の稼働時間の合計', () => {
		const m = september();
		setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '18:00' }] });
		setDay(m, '2026-09-02', {
			workPeriods: [
				{ start: '09:00', end: '12:00' },
				{ start: '13:00', end: '19:00' }
			]
		});
		expect(summarize(m, '2026-09-30').actualMinutes).toBe(540 + 540);
	});

	describe('ペース差分', () => {
		it('本日は「本日まで」に含める', () => {
			const m = september();
			// 09-01 と 09-02 が平日。2 日ぶん働いて、本日が 09-02 ならちょうど 0
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '17:00' }] });
			setDay(m, '2026-09-02', { workPeriods: [{ start: '09:00', end: '17:00' }] });
			expect(summarize(m, '2026-09-02').paceMinutes).toBe(0);
		});

		it('本日の前日を基準にすると 1 日ぶんの貯金になる', () => {
			const m = september();
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '17:00' }] });
			setDay(m, '2026-09-02', { workPeriods: [{ start: '09:00', end: '17:00' }] });
			expect(summarize(m, '2026-09-01').paceMinutes).toBe(8 * 60);
		});

		it('過去月では実績 − 想定になる', () => {
			const m = september();
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '17:00' }] });
			const s = summarize(m, '2026-12-01');
			expect(s.paceMinutes).toBe(8 * 60 - 22 * 8 * 60);
		});

		it('未来月では実績そのものになる', () => {
			const s = summarize(september(), '2026-01-01');
			expect(s.paceMinutes).toBe(0);
			expect(s.projectedMinutes).toBe(22 * 8 * 60);
		});
	});

	describe('着地見込み', () => {
		it('残りの稼働予定日を想定稼働時間で埋める', () => {
			const m = september();
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '21:00' }] });
			// 09-01 は 12h 稼働。残りの平日 21 日 × 8h
			expect(summarize(m, '2026-09-01').projectedMinutes).toBe(12 * 60 + 21 * 8 * 60);
		});

		it('過去月では実績そのものになる', () => {
			const m = september();
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '17:00' }] });
			expect(summarize(m, '2026-12-01').projectedMinutes).toBe(8 * 60);
		});
	});

	describe('精算幅', () => {
		// 精算幅を小さくして、少ない日数で上下をまたげるようにする
		const narrow = (m: MonthData) => {
			m.contract = { ...m.contract, lowerHours: 8, upperHours: 16 };
			return m;
		};

		it('上限を超えた分を超過時間にする', () => {
			const m = narrow(september());
			setDay(m, '2026-09-01', { workPeriods: [{ start: '06:00', end: '23:00' }] });
			const s = summarize(m, '2026-09-30');
			expect(s.actualMinutes).toBe(17 * 60);
			expect(s.overMinutes).toBe(60);
			expect(s.shortMinutes).toBe(0);
			expect(s.toUpperMinutes).toBe(-60);
		});

		it('下限に届かない分を不足時間にする', () => {
			const m = narrow(september());
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '15:00' }] });
			const s = summarize(m, '2026-09-30');
			expect(s.actualMinutes).toBe(6 * 60);
			expect(s.shortMinutes).toBe(2 * 60);
			expect(s.overMinutes).toBe(0);
			expect(s.toLowerMinutes).toBe(2 * 60);
		});

		it('精算幅の中に収まれば超過も不足も 0', () => {
			const m = narrow(september());
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '19:00' }] });
			const s = summarize(m, '2026-09-30');
			expect(s.overMinutes).toBe(0);
			expect(s.shortMinutes).toBe(0);
		});
	});
});

describe('workedDays', () => {
	it('稼働時間が記録された日を数える', () => {
		const m = september();
		setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '18:00' }] });
		setDay(m, '2026-09-02', { workPeriods: [{ start: '09:00', end: '18:00' }] });
		setDay(m, '2026-09-03', { dayType: 'holiday' });
		expect(workedDays(m)).toBe(2);
	});
});
