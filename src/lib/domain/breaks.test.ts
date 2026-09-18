import { describe, expect, it } from 'vitest';
import { breakTotal, overlappingIndexes, sortBreaks } from './breaks';

const b = (start: string, end: string) => ({ start, end });

describe('sortBreaks', () => {
	it('start の昇順に並べ、元の配列を変えない', () => {
		const input = [b('15:00', '15:15'), b('12:00', '13:00')];
		expect(sortBreaks(input).map((x) => x.start)).toEqual(['12:00', '15:00']);
		expect(input[0].start).toBe('15:00');
	});

	it('24 時超えの区間も正しく並ぶ', () => {
		const sorted = sortBreaks([b('25:00', '25:30'), b('23:00', '23:30')]);
		expect(sorted.map((x) => x.start)).toEqual(['23:00', '25:00']);
	});
});

describe('breakTotal', () => {
	it('区間の長さの総和を返す', () => {
		expect(breakTotal([b('12:00', '13:00'), b('15:00', '15:15')])).toBe(75);
		expect(breakTotal([])).toBe(0);
	});

	it('日付をまたいだ位置の休憩も扱える', () => {
		expect(breakTotal([b('25:00', '25:30')])).toBe(30);
	});
});

describe('overlappingIndexes', () => {
	it('隣接は重なりとしない', () => {
		expect(overlappingIndexes([b('12:00', '13:00'), b('13:00', '13:30')])).toEqual([]);
	});

	it('重なっている両方の添字を返す', () => {
		expect(overlappingIndexes([b('12:00', '13:00'), b('12:30', '13:30')])).toEqual([0, 1]);
	});

	it('一方が他方を完全に含む場合も検出する', () => {
		expect(overlappingIndexes([b('12:00', '18:00'), b('13:00', '14:00')])).toEqual([0, 1]);
	});

	it('並び順に関係なく検出する', () => {
		expect(overlappingIndexes([b('13:00', '14:00'), b('12:00', '18:00')])).toEqual([0, 1]);
	});

	it('重なっていない区間は返さない', () => {
		const result = overlappingIndexes([b('10:00', '20:00'), b('11:00', '12:00'), b('21:00', '22:00')]);
		expect(result).toEqual([0, 1]);
	});
});
