import { describe, expect, it } from 'vitest';
import { applyDayTypeChange, suggestContent, needsClearConfirm } from './dayEdit';
import { day, workDay } from './testing';

describe('needsClearConfirm', () => {
	it('work から他の区分へ移すとき、稼働データがあれば確認する', () => {
		expect(needsClearConfirm(workDay('2026-09-01', ['09:00', '18:00']), 'personal')).toBe(true);
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
		const next = applyDayTypeChange(workDay('2026-09-01', ['09:00', '12:00'], ['13:00', '18:00']), 'personal');
		expect(next.workPeriods).toEqual([]);
	});

	it('私用休には文言を自動入力する', () => {
		const next = applyDayTypeChange(day('2026-09-01'), 'personal');
		expect(next.workContent).toBe('私用休暇');
		expect(next.contentAutoFilled).toBe(true);
	});

	it.each(['weekend', 'holiday', 'clientClosed'] as const)('%s には文言を入れない', (type) => {
		const next = applyDayTypeChange(day('2026-09-01'), type);
		expect(next.workContent).toBe('');
		expect(next.contentAutoFilled).toBe(false);
	});

	it('手入力された作業内容は上書きしない', () => {
		const d = day('2026-09-01', { workContent: '客先打ち合わせ' });
		const next = applyDayTypeChange(d, 'holiday');
		expect(next.workContent).toBe('客先打ち合わせ');
		expect(next.contentAutoFilled).toBe(false);
	});

	it('文言のない区分へ移すと自動入力された文言を消す', () => {
		const filled = applyDayTypeChange(day('2026-09-01'), 'personal');
		const next = applyDayTypeChange(filled, 'holiday');
		expect(next.workContent).toBe('');
		expect(next.contentAutoFilled).toBe(false);
	});

	it('work へ戻すと自動入力された文言だけを消す', () => {
		const filled = applyDayTypeChange(day('2026-09-01'), 'personal');
		const back = applyDayTypeChange(filled, 'work');
		expect(back.workContent).toBe('');
		expect(back.contentAutoFilled).toBe(false);
	});

	it('work へ戻しても手入力は消さない', () => {
		const d = day('2026-09-01', { dayType: 'holiday', workContent: '自分で書いた' });
		expect(applyDayTypeChange(d, 'work').workContent).toBe('自分で書いた');
	});

	it('work へ戻すときは稼働データを触らない', () => {
		const d = day('2026-09-05', { dayType: 'weekend', workPeriods: [{ start: '10:00', end: '15:00' }] });
		expect(applyDayTypeChange(d, 'work').workPeriods).toEqual([{ start: '10:00', end: '15:00' }]);
	});
});

describe('suggestContent', () => {
	const days = [
		day('2026-09-01', { workContent: '認証基盤のリファクタリング' }),
		day('2026-09-02', { dayType: 'personal', workContent: '私用休暇', contentAutoFilled: true }),
		day('2026-09-03'),
		day('2026-09-04')
	];

	it('手入力された作業内容を持つ直近の日から取る', () => {
		expect(suggestContent(days, 3)).toBe('認証基盤のリファクタリング');
	});

	it('自動入力された文言は取り出し元にしない', () => {
		expect(suggestContent(days, 2)).toBe('認証基盤のリファクタリング');
	});

	it('手入力であれば稼働しない日の作業内容も取り出し元にする', () => {
		const withHoliday = [days[0], day('2026-09-02', { dayType: 'holiday', workContent: '障害対応' }), days[2]];
		expect(suggestContent(withHoliday, 2)).toBe('障害対応');
	});

	it('作業内容が入っている日には入れない', () => {
		const filled = [days[0], day('2026-09-02', { workContent: '設計レビュー' })];
		expect(suggestContent(filled, 1)).toBeNull();
	});

	it('稼働しない日には入れない', () => {
		const weekend = [days[0], day('2026-09-05', { dayType: 'weekend' })];
		expect(suggestContent(weekend, 1)).toBeNull();
	});

	it('月初では取り出し元がない', () => {
		expect(suggestContent(days, 0)).toBeNull();
	});
});
