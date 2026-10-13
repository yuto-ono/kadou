import { describe, expect, it } from 'vitest';
import { emptyMonth } from './calendar';
import { CONTRACT_DEFAULTS } from './defaults';
import { summarize } from './summary';
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
		const s = summarize(september());
		expect(s.plannedDays).toBe(22);
		expect(s.plannedMinutes).toBe(22 * 8 * 60);
	});

	it('祝日・私用休は稼働予定日から外れ、内訳に入る', () => {
		const m = september();
		setType(m, '2026-09-21', 'holiday');
		setType(m, '2026-09-22', 'personal');
		setType(m, '2026-09-24', 'clientClosed');
		const s = summarize(m);
		expect(s.plannedDays).toBe(19);
		expect(s.breakdown).toEqual({ weekend: 8, holiday: 1, personal: 1, clientClosed: 1 });
	});

	it('土日でも work にすれば稼働予定日に入る', () => {
		const m = september();
		setType(m, '2026-09-05', 'work');
		const s = summarize(m);
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
		expect(summarize(m).actualMinutes).toBe(540 + 540);
	});

	describe('ペース差分', () => {
		it('入力済みの稼働予定日だけを想定と比べる', () => {
			const m = september();
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '18:00' }] });
			setDay(m, '2026-09-02', { workPeriods: [{ start: '09:00', end: '17:00' }] });
			// 2 日入力済みで 17h。想定は 2 日 × 8h
			expect(summarize(m).paceMinutes).toBe(60);
		});

		it('日付に関係なく、未入力の日は借金にしない', () => {
			const m = september();
			// 月末の 1 日だけ入力して、それより前は未入力のまま
			setDay(m, '2026-09-30', { workPeriods: [{ start: '09:00', end: '17:00' }] });
			expect(summarize(m).paceMinutes).toBe(0);
		});

		it('稼働予定日以外の稼働は貯金になる', () => {
			const m = september();
			// 09-05 は土曜
			setDay(m, '2026-09-05', { workPeriods: [{ start: '10:00', end: '13:00' }] });
			expect(summarize(m).paceMinutes).toBe(3 * 60);
		});

		it('何も入力していなければ 0', () => {
			expect(summarize(september()).paceMinutes).toBe(0);
		});
	});

	describe('着地見込み', () => {
		it('未入力の稼働予定日を想定稼働時間で埋める', () => {
			const m = september();
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '21:00' }] });
			// 09-01 は 12h 稼働。残りの平日 21 日 × 8h
			expect(summarize(m).projectedMinutes).toBe(12 * 60 + 21 * 8 * 60);
		});

		it('入力の抜けた過去の日も想定で埋める', () => {
			const m = september();
			// 数日分ためている想定。09-01〜09-03 が未入力で 09-04 だけ入力済み
			setDay(m, '2026-09-04', { workPeriods: [{ start: '09:00', end: '17:00' }] });
			expect(summarize(m).projectedMinutes).toBe(22 * 8 * 60);
		});

		it('入力途中の日は実績だけを数える', () => {
			const m = september();
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '12:00' }] });
			expect(summarize(m).projectedMinutes).toBe(3 * 60 + 21 * 8 * 60);
		});

		it('すべて入力済みなら実績そのものになる', () => {
			const m = september();
			for (const day of m.days) {
				if (day.dayType === 'work') {
					setDay(m, day.date, { workPeriods: [{ start: '09:00', end: '16:00' }] });
				}
			}
			const s = summarize(m);
			expect(s.projectedMinutes).toBe(s.actualMinutes);
			expect(s.projectedMinutes).toBe(22 * 7 * 60);
		});

		it('想定稼働時間 + ペース差分に一致する', () => {
			const m = september();
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '20:00' }] });
			setDay(m, '2026-09-06', { workPeriods: [{ start: '10:00', end: '12:00' }] });
			const s = summarize(m);
			expect(s.projectedMinutes).toBe(s.plannedMinutes + s.paceMinutes);
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
			const s = summarize(m);
			expect(s.actualMinutes).toBe(17 * 60);
			expect(s.overMinutes).toBe(60);
			expect(s.shortMinutes).toBe(0);
			expect(s.toUpperMinutes).toBe(-60);
		});

		it('下限に届かない分を不足時間にする', () => {
			const m = narrow(september());
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '15:00' }] });
			const s = summarize(m);
			expect(s.actualMinutes).toBe(6 * 60);
			expect(s.shortMinutes).toBe(2 * 60);
			expect(s.overMinutes).toBe(0);
			expect(s.toLowerMinutes).toBe(2 * 60);
		});

		it('精算幅の中に収まれば超過も不足も 0', () => {
			const m = narrow(september());
			setDay(m, '2026-09-01', { workPeriods: [{ start: '09:00', end: '19:00' }] });
			const s = summarize(m);
			expect(s.overMinutes).toBe(0);
			expect(s.shortMinutes).toBe(0);
		});
	});
});
