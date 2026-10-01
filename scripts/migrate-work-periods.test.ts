import { describe, expect, it } from 'vitest';
import { parseMonth } from '$lib/persistence/month-parse';
import { migrateMonthText, MigrationError, toWorkPeriods } from './migrate-work-periods.js';

const b = (start: string, end: string) => ({ start, end });

describe('toWorkPeriods', () => {
	it('開始〜終了から休憩を除いた区間にする', () => {
		expect(toWorkPeriods('09:30', '19:00', [b('12:00', '13:00')], 'd')).toEqual([
			b('09:30', '12:00'),
			b('13:00', '19:00')
		]);
	});

	it('休憩がなければ 1 区間', () => {
		expect(toWorkPeriods('09:00', '18:00', [], 'd')).toEqual([b('09:00', '18:00')]);
	});

	it('並んでいない休憩も扱う', () => {
		expect(toWorkPeriods('09:00', '18:00', [b('15:00', '15:15'), b('12:00', '13:00')], 'd')).toEqual([
			b('09:00', '12:00'),
			b('13:00', '15:00'),
			b('15:15', '18:00')
		]);
	});

	it('開始・終了に接した休憩は長さ 0 の区間を作らない', () => {
		expect(toWorkPeriods('09:00', '18:00', [b('09:00', '09:30'), b('17:30', '18:00')], 'd')).toEqual([
			b('09:30', '17:30')
		]);
	});

	it('隣接する休憩は 1 つの空き時間になる', () => {
		expect(toWorkPeriods('09:00', '18:00', [b('12:00', '12:30'), b('12:30', '13:00')], 'd')).toEqual([
			b('09:00', '12:00'),
			b('13:00', '18:00')
		]);
	});

	it('24 時超えの時刻を扱う', () => {
		expect(toWorkPeriods('13:00', '26:00', [b('25:00', '25:30')], 'd')).toEqual([
			b('13:00', '25:00'),
			b('25:30', '26:00')
		]);
	});

	it('時刻のない日は空にする', () => {
		expect(toWorkPeriods(null, null, [], 'd')).toEqual([]);
	});

	it.each([
		['片方しかない', '09:00', null, []],
		['時刻がないのに休憩がある', null, null, [b('12:00', '13:00')]],
		['終了が開始以前', '18:00', '09:00', []],
		['休憩が外枠の外', '09:00', '18:00', [b('08:00', '09:30')]],
		['休憩が重なる', '09:00', '18:00', [b('12:00', '13:00'), b('12:30', '13:30')]],
		['休憩が外枠を覆う', '09:00', '10:00', [b('09:00', '10:00')]],
		['時刻として読めない', '朝', '18:00', []]
	])('検証エラーを含む日は補正せず止める: %s', (_, start, end, breaks) => {
		expect(() => toWorkPeriods(start, end, breaks, 'd')).toThrow(MigrationError);
	});
});

describe('migrateMonthText', () => {
	const legacy = `month: "2026-09"
contract:
  workerName: 山田 太郎
  clientName: 客先
  lowerHours: 140
  upperHours: 180
  dailyHours: 8
days:
  - date: "2026-09-01"
    dayType: work
    startTime: "09:30"
    endTime: "19:00"
    breaks:
      - start: "12:00"
        end: "13:00"
    workContent: "認証: 基盤の改修"
    journal: |
      メモ
  - date: "2026-09-02"
    dayType: work
    startTime: "10:00"
    endTime: "18:00"
  - date: "2026-09-05"
    dayType: weekend
`;

	it('workPeriods へ置き換え、旧形式のあった位置に差し込む', () => {
		expect(migrateMonthText(legacy)).toBe(`month: "2026-09"
contract:
  workerName: 山田 太郎
  clientName: 客先
  lowerHours: 140
  upperHours: 180
  dailyHours: 8
days:
  - date: "2026-09-01"
    dayType: work
    workPeriods:
      - start: "09:30"
        end: "12:00"
      - start: "13:00"
        end: "19:00"
    workContent: "認証: 基盤の改修"
    journal: |
      メモ
  - date: "2026-09-02"
    dayType: work
    workPeriods:
      - start: "10:00"
        end: "18:00"
  - date: "2026-09-05"
    dayType: weekend
`);
	});

	it('変換結果をアプリが警告なしで読める', () => {
		const { data, issues } = parseMonth(migrateMonthText(legacy)!, '2026-09');
		expect(issues).toEqual([]);
		expect(data.days[0].workPeriods).toEqual([b('09:30', '12:00'), b('13:00', '19:00')]);
	});

	it('旧形式のフィールドがなければ null', () => {
		expect(migrateMonthText(migrateMonthText(legacy)!)).toBeNull();
	});

	it('空の breaks だけが残っている日も片付ける', () => {
		const text = 'month: "2026-09"\ndays:\n  - date: "2026-09-01"\n    dayType: work\n    breaks: []\n';
		expect(migrateMonthText(text)).toBe('month: "2026-09"\ndays:\n  - date: "2026-09-01"\n    dayType: work\n');
	});
});
