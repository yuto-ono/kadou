import { describe, expect, it } from 'vitest';
import { overlappingIndexes, periodSpan, periodTotal, sortPeriods } from './periods';

const p = (start: string, end: string) => ({ start, end });

describe('sortPeriods', () => {
	it('start の昇順に並べ、元の配列を変えない', () => {
		const input = [p('13:00', '19:00'), p('09:30', '12:00')];
		expect(sortPeriods(input).map((x) => x.start)).toEqual(['09:30', '13:00']);
		expect(input[0].start).toBe('13:00');
	});

	it('24 時超えの区間も正しく並ぶ', () => {
		const sorted = sortPeriods([p('25:00', '26:00'), p('20:00', '23:30')]);
		expect(sorted.map((x) => x.start)).toEqual(['20:00', '25:00']);
	});
});

describe('periodTotal', () => {
	it('区間の長さの総和を返す', () => {
		expect(periodTotal([p('09:30', '12:00'), p('13:00', '19:00')])).toBe(510);
		expect(periodTotal([])).toBe(0);
	});

	it('日付をまたいだ位置の区間も扱える', () => {
		expect(periodTotal([p('25:00', '26:30')])).toBe(90);
	});
});

describe('periodSpan', () => {
	it('最も早い開始と最も遅い終了を返す', () => {
		expect(periodSpan([p('09:30', '12:00'), p('13:00', '19:00')])).toEqual({ start: '09:30', end: '19:00' });
	});

	it('並べ替える前の配列でも最小・最大を取る', () => {
		expect(periodSpan([p('13:00', '26:00'), p('09:30', '12:00')])).toEqual({ start: '09:30', end: '26:00' });
	});

	it('区間がなければ null', () => {
		expect(periodSpan([])).toBeNull();
	});
});

describe('overlappingIndexes', () => {
	it('隣接は重なりとしない', () => {
		expect(overlappingIndexes([p('09:30', '12:00'), p('12:00', '13:00')])).toEqual([]);
	});

	it('重なっている両方の添字を返す', () => {
		expect(overlappingIndexes([p('09:00', '13:00'), p('12:30', '18:00')])).toEqual([0, 1]);
	});

	it('一方が他方を完全に含む場合も検出する', () => {
		expect(overlappingIndexes([p('09:00', '18:00'), p('13:00', '14:00')])).toEqual([0, 1]);
	});

	it('並び順に関係なく検出する', () => {
		expect(overlappingIndexes([p('13:00', '14:00'), p('09:00', '18:00')])).toEqual([0, 1]);
	});

	it('重なっていない区間は返さない', () => {
		const result = overlappingIndexes([p('09:00', '18:00'), p('11:00', '12:00'), p('19:00', '20:00')]);
		expect(result).toEqual([0, 1]);
	});
});
