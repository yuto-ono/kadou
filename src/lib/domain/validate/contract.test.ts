import { describe, expect, it } from 'vitest';
import { CONTRACT_DEFAULTS } from '../defaults';
import type { Contract } from '../types';
import { blocksMonthCreation, validateContract } from './contract';

const valid: Contract = {
	...CONTRACT_DEFAULTS,
	workerName: '山田 太郎',
	projectName: '勤怠管理システム開発',
	clientName: '株式会社サンプル'
};

const codes = (patch: Partial<Contract> = {}) =>
	validateContract({ ...valid, ...patch }).map((i) => i.code);

describe('validateContract', () => {
	it('既定値どおりなら通る', () => {
		expect(codes()).toEqual([]);
	});

	it('氏名・案件名・客先名は空にできない', () => {
		expect(codes({ workerName: '' })).toEqual(['contractNameEmpty']);
		expect(codes({ projectName: '   ' })).toEqual(['contractNameEmpty']);
		expect(codes({ workerName: '', clientName: '' })).toHaveLength(2);
	});

	it('下限 ≦ 上限', () => {
		expect(codes({ lowerHours: 180, upperHours: 180 })).toEqual([]);
		expect(codes({ lowerHours: 181, upperHours: 180 })).toEqual(['contractRangeInverted']);
	});

	it('1 日の想定稼働時間は 0 より大きい', () => {
		expect(codes({ dailyHours: 0 })).toEqual(['contractDailyHoursNotPositive']);
		expect(codes({ dailyHours: -1 })).toEqual(['contractDailyHoursNotPositive']);
	});

	it('maxEndTime は 24:00〜47:59', () => {
		expect(codes({ maxEndTime: '24:00' })).toEqual([]);
		expect(codes({ maxEndTime: '47:59' })).toEqual([]);
		expect(codes({ maxEndTime: '23:59' })).toEqual(['contractMaxEndTimeOutOfRange']);
		expect(codes({ maxEndTime: '48:00' })).toEqual(['contractMaxEndTimeOutOfRange']);
		expect(codes({ maxEndTime: 'なし' })).toEqual(['contractMaxEndTimeOutOfRange']);
	});
});

describe('blocksMonthCreation', () => {
	it('契約設定の違反があれば月の新規作成を止める', () => {
		expect(blocksMonthCreation(validateContract({ ...valid, workerName: '' }))).toBe(true);
		expect(blocksMonthCreation(validateContract(valid))).toBe(false);
	});
});
