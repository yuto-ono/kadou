import { describe, expect, it } from 'vitest';
import { validateContract } from '#lib/domain/validate/contract.ts';
import { ContractSyntaxError, parseContract } from './contract-parse';
import { CONTRACT_TEMPLATE } from './contract-template';

describe('parseContract', () => {
	it('書かれた値を読む', () => {
		const c = parseContract(`
workerName: 山田 太郎
clientName: 株式会社サンプル
lowerHours: 150
upperHours: 190
dailyHours: 7.5
maxEndTime: "30:00"
`);
		expect(c).toEqual({
			workerName: '山田 太郎',
			clientName: '株式会社サンプル',
			lowerHours: 150,
			upperHours: 190,
			dailyHours: 7.5,
			maxEndTime: '30:00'
		});
	});

	it('欠けたフィールドは既定値で埋める', () => {
		const c = parseContract('workerName: 山田 太郎\n');
		expect(c).toMatchObject({ lowerHours: 140, upperHours: 180, dailyHours: 8, maxEndTime: '28:00' });
	});

	it('クォートし忘れた maxEndTime を文字列へ戻す', () => {
		// YAML 1.1 では 60 進数の整数として読まれる
		expect(parseContract('%YAML 1.1\n---\nmaxEndTime: 28:00\n').maxEndTime).toBe('28:00');
	});

	it('解釈できない maxEndTime は既定値へ倒さず、検証にエラーを出させる', () => {
		const c = parseContract('maxEndTime: よるおそく\n');
		expect(c.maxEndTime).toBe('');
		expect(validateContract(c).map((i) => i.code)).toContain('contractMaxEndTimeOutOfRange');
	});

	it('不正な値も持ち上げる（止めるのは検証の責務）', () => {
		const c = parseContract('lowerHours: 200\nupperHours: 100\n');
		expect(c.lowerHours).toBe(200);
		expect(validateContract(c).map((i) => i.code)).toContain('contractRangeInverted');
	});

	it('構文エラーは例外にする', () => {
		expect(() => parseContract('workerName: [unclosed\n')).toThrow(ContractSyntaxError);
	});
});

describe('CONTRACT_TEMPLATE', () => {
	it('そのまま読み込める', () => {
		expect(() => parseContract(CONTRACT_TEMPLATE)).not.toThrow();
	});

	it('雛形を埋めれば検証を通る（氏名などは利用者が書き換える前提）', () => {
		const c = parseContract(CONTRACT_TEMPLATE);
		expect(validateContract(c)).toEqual([]);
	});
});
