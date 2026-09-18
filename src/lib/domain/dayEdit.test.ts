import { describe, expect, it } from 'vitest';
import { applyDayTypeChange, copyWorkTimes, findPreviousWorkday, needsClearConfirm } from './dayEdit';
import { day, workDay } from './testing';

describe('needsClearConfirm', () => {
	it('work から他の区分へ移すとき、稼働データがあれば確認する', () => {
		expect(needsClearConfirm(workDay('2026-09-01', '09:00', '18:00'), 'personal')).toBe(true);
		expect(needsClearConfirm(day('2026-09-01', { breaks: [{ start: '12:00', end: '13:00' }] }), 'holiday')).toBe(true);
	});

	it('稼働データがなければ確認しない', () => {
		expect(needsClearConfirm(day('2026-09-01'), 'holiday')).toBe(false);
	});

	it('work へ戻すときは確認しない', () => {
		expect(needsClearConfirm(day('2026-09-05', { dayType: 'weekend' }), 'work')).toBe(false);
	});
});

describe('applyDayTypeChange', () => {
	it('work 以外へ移すと稼働データを消す', () => {
		const next = applyDayTypeChange(
			workDay('2026-09-01', '09:00', '18:00', [{ start: '12:00', end: '13:00' }]),
			'personal'
		);
		expect(next).toMatchObject({ startTime: null, endTime: null, breaks: [] });
	});

	it('区分に応じた文言を自動入力する', () => {
		expect(applyDayTypeChange(day('2026-09-01'), 'personal').workContent).toBe('休暇');
		expect(applyDayTypeChange(day('2026-09-01'), 'holiday').workContent).toBe('祝日');
		expect(applyDayTypeChange(day('2026-09-01'), 'clientClosed').workContent).toBe('客先休業');
	});

	it('土日には文言を入れない', () => {
		const next = applyDayTypeChange(day('2026-09-01'), 'weekend');
		expect(next.workContent).toBe('');
		expect(next.contentAutoFilled).toBe(false);
	});

	it('手入力された作業内容は上書きしない', () => {
		const d = day('2026-09-01', { workContent: '客先打ち合わせ' });
		const next = applyDayTypeChange(d, 'holiday');
		expect(next.workContent).toBe('客先打ち合わせ');
		expect(next.contentAutoFilled).toBe(false);
	});

	it('自動入力どうしは差し替える', () => {
		const filled = applyDayTypeChange(day('2026-09-01'), 'personal');
		expect(applyDayTypeChange(filled, 'holiday').workContent).toBe('祝日');
	});

	it('work へ戻すと自動入力された文言だけを消す', () => {
		const filled = applyDayTypeChange(day('2026-09-01'), 'holiday');
		const back = applyDayTypeChange(filled, 'work');
		expect(back.workContent).toBe('');
		expect(back.contentAutoFilled).toBe(false);
	});

	it('work へ戻しても手入力は消さない', () => {
		const d = day('2026-09-01', { dayType: 'holiday', workContent: '自分で書いた' });
		expect(applyDayTypeChange(d, 'work').workContent).toBe('自分で書いた');
	});

	it('work へ戻すときは稼働データを触らない', () => {
		const d = day('2026-09-05', { dayType: 'weekend', startTime: '10:00', endTime: '15:00' });
		expect(applyDayTypeChange(d, 'work')).toMatchObject({ startTime: '10:00', endTime: '15:00' });
	});
});

describe('findPreviousWorkday', () => {
	const days = [
		workDay('2026-09-01', '09:00', '18:00'),
		day('2026-09-02'),
		day('2026-09-03')
	];

	it('開始時刻が入っている直近の日を返す', () => {
		expect(findPreviousWorkday(days, 2)?.date).toBe('2026-09-01');
	});

	it('月初では複製元がない', () => {
		expect(findPreviousWorkday(days, 0)).toBeNull();
	});

	it('自分自身は複製元にしない', () => {
		expect(findPreviousWorkday(days, 1)?.date).toBe('2026-09-01');
	});
});

describe('copyWorkTimes', () => {
	const source = workDay('2026-09-01', '09:30', '19:00', [{ start: '12:00', end: '13:00' }]);

	it('開始・終了・休憩を複製する', () => {
		const next = copyWorkTimes(day('2026-09-02'), source);
		expect(next).toMatchObject({ startTime: '09:30', endTime: '19:00' });
		expect(next.breaks).toEqual([{ start: '12:00', end: '13:00' }]);
	});

	it('休憩は複製先が別の配列を持つ', () => {
		const next = copyWorkTimes(day('2026-09-02'), source);
		next.breaks[0].start = '11:00';
		expect(source.breaks[0].start).toBe('12:00');
	});

	it('作業内容と journal は複製しない', () => {
		const withContent = { ...source, workContent: '前日の作業', journal: '前日のメモ' };
		const next = copyWorkTimes(day('2026-09-02'), withContent);
		expect(next.workContent).toBe('');
		expect(next.journal).toBe('');
	});
});
