import { describe, expect, it } from 'vitest';
import { emptyMonth } from './calendar';
import { CONTRACT_DEFAULTS } from './defaults';
import { buildReport } from './report';
import type { MonthData } from './types';

function september(): MonthData {
	return emptyMonth('2026-09', {
		...CONTRACT_DEFAULTS,
		workerName: '山田 太郎',
		clientName: '株式会社サンプル'
	});
}

const rowOf = (m: MonthData, date: string) =>
	buildReport(m).rows.find((r) => r.date === date)!;

function setDay(m: MonthData, date: string, patch: Partial<MonthData['days'][number]>) {
	const i = m.days.findIndex((d) => d.date === date);
	m.days[i] = { ...m.days[i], ...patch };
}

describe('ヘッダ', () => {
	it('対象期間と契約スナップショットの値を出す', () => {
		const r = buildReport(september());
		expect(r.period).toBe('2026年9月1日 〜 2026年9月30日');
		expect(r.workerName).toBe('山田 太郎');
		expect(r.clientName).toBe('株式会社サンプル');
	});
});

describe('明細表', () => {
	it('1 日〜末日の全日を行として出す（SPEC.md §7.1）', () => {
		expect(buildReport(september()).rows).toHaveLength(30);
	});

	it('24 時超えの終了時刻を翌日表記へ変換する', () => {
		const m = september();
		setDay(m, '2026-09-01', { startTime: '13:00', endTime: '26:00' });
		expect(rowOf(m, '2026-09-01')).toMatchObject({ start: '13:00', end: '翌2:00' });
	});

	it('休憩は合計のみを出し、ない日は空欄にする', () => {
		const m = september();
		setDay(m, '2026-09-01', {
			startTime: '09:00',
			endTime: '19:00',
			breaks: [
				{ start: '12:00', end: '13:00' },
				{ start: '15:00', end: '15:15' }
			]
		});
		setDay(m, '2026-09-02', { startTime: '09:00', endTime: '18:00' });
		expect(rowOf(m, '2026-09-01').breakTime).toBe('1:15');
		expect(rowOf(m, '2026-09-02').breakTime).toBe('');
	});

	it('稼働しない日は時刻も稼働時間も空欄', () => {
		const m = september();
		setDay(m, '2026-09-21', { dayType: 'holiday', workContent: '祝日' });
		expect(rowOf(m, '2026-09-21')).toMatchObject({
			start: '',
			end: '',
			breakTime: '',
			workTime: '',
			workContent: '祝日'
		});
	});

	it('土日は曜日で判別でき、作業内容は空欄になる', () => {
		const row = rowOf(september(), '2026-09-05');
		expect(row).toMatchObject({ weekday: '土', isWeekend: true, workContent: '' });
	});

	it('土日でも手入力があれば出力する（SPEC.md §7.1）', () => {
		const m = september();
		setDay(m, '2026-09-05', { workContent: '障害対応' });
		expect(rowOf(m, '2026-09-05').workContent).toBe('障害対応');
	});

	it('日付は日だけを出す', () => {
		expect(rowOf(september(), '2026-09-01').day).toBe('1');
		expect(rowOf(september(), '2026-09-30').day).toBe('30');
	});
});

describe('フッタ', () => {
	it('稼働日数と合計稼働時間を出す', () => {
		const m = september();
		setDay(m, '2026-09-01', { startTime: '09:00', endTime: '19:00', breaks: [{ start: '12:00', end: '13:00' }] });
		setDay(m, '2026-09-02', { startTime: '09:00', endTime: '18:00' });
		const f = buildReport(m).footer;
		expect(f.workedDays).toBe(2);
		expect(f.totalWorkTime).toBe('18:00');
	});

	it('精算幅を出す', () => {
		expect(buildReport(september()).footer.settlementRange).toBe('140〜180h');
	});

	it('超過・不足を出し、どちらでもなければ「なし」', () => {
		const m = september();
		m.contract = { ...m.contract, lowerHours: 8, upperHours: 16 };
		setDay(m, '2026-09-01', { startTime: '06:00', endTime: '23:00' });
		expect(buildReport(m).footer.difference).toBe('1:00 超過');

		const short = september();
		short.contract = { ...short.contract, lowerHours: 8, upperHours: 16 };
		setDay(short, '2026-09-01', { startTime: '09:00', endTime: '15:00' });
		expect(buildReport(short).footer.difference).toBe('2:00 不足');

		const inside = september();
		inside.contract = { ...inside.contract, lowerHours: 8, upperHours: 16 };
		setDay(inside, '2026-09-01', { startTime: '09:00', endTime: '19:00' });
		expect(buildReport(inside).footer.difference).toBe('なし');
	});

	it('合計は 3 桁の時間も出せる', () => {
		const m = september();
		for (const d of m.days) setDay(m, d.date, { startTime: '09:00', endTime: '17:00' });
		expect(buildReport(m).footer.totalWorkTime).toBe('240:00');
	});

	it('特記事項をそのまま渡す', () => {
		const m = september();
		m.remarks = '祝日が重なりました。';
		expect(buildReport(m).footer.remarks).toBe('祝日が重なりました。');
		expect(buildReport(september()).footer.remarks).toBe('');
	});
});
