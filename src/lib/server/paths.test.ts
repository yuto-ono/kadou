import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	contractPath,
	dataDir,
	InvalidMonthError,
	journalDir,
	monthFromFilename,
	monthPath
} from './paths';

const original = process.env.KADOU_DATA_DIR;
afterEach(() => {
	if (original === undefined) delete process.env.KADOU_DATA_DIR;
	else process.env.KADOU_DATA_DIR = original;
});

describe('dataDir', () => {
	it('未指定ならカレントディレクトリ', () => {
		delete process.env.KADOU_DATA_DIR;
		expect(dataDir()).toBe(process.cwd());
	});

	it('相対パスはカレントディレクトリから解決する', () => {
		process.env.KADOU_DATA_DIR = 'records';
		expect(dataDir()).toBe(`${process.cwd()}/records`);
	});

	it('絶対パスはそのまま使う', () => {
		process.env.KADOU_DATA_DIR = '/var/kadou';
		expect(dataDir()).toBe('/var/kadou');
		expect(contractPath()).toBe('/var/kadou/contract.yaml');
	});
});

describe('monthPath', () => {
	beforeEach(() => {
		process.env.KADOU_DATA_DIR = '/var/kadou';
	});

	it('months/ の下に置く', () => {
		expect(monthPath('2026-09')).toBe('/var/kadou/months/2026-09.yaml');
	});

	it('journal は月の YAML の隣のディレクトリに置く', () => {
		expect(journalDir('2026-09')).toBe('/var/kadou/months/2026-09');
		expect(() => journalDir('../etc')).toThrow(InvalidMonthError);
	});

	it('月として妥当でない文字列を拒む', () => {
		for (const bad of ['2026-13', '2026-9', '202609', '', 'latest']) {
			expect(() => monthPath(bad), bad).toThrow(InvalidMonthError);
		}
	});

	it('パストラバーサルを拒む', () => {
		for (const bad of ['../etc/passwd', '2026-09/../../etc', '..', '/etc/passwd']) {
			expect(() => monthPath(bad), bad).toThrow(InvalidMonthError);
		}
	});
});

describe('monthFromFilename', () => {
	it('月次データのファイル名だけを拾う', () => {
		expect(monthFromFilename('2026-09.yaml')).toBe('2026-09');
		expect(monthFromFilename('2026-13.yaml')).toBeNull();
		expect(monthFromFilename('contract.yaml')).toBeNull();
		expect(monthFromFilename('2026-09.yml')).toBeNull();
		expect(monthFromFilename('.2026-09.yaml.tmp')).toBeNull();
	});
});
