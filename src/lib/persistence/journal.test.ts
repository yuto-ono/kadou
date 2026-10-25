import { describe, expect, it } from 'vitest';
import { emptyMonth } from '#lib/domain/calendar.ts';
import { CONTRACT_DEFAULTS } from '#lib/domain/defaults.ts';
import { journalFilename, mergeJournals, parseJournal, serializeJournal } from './journal';

describe('serializeJournal', () => {
	it('1 行目に日付と曜日の見出しを付け、空行を挟んで本文を書く', () => {
		expect(serializeJournal('2026-09-01', 'レビュー指摘の対応。\n- 順序を入れ替え')).toBe(
			'# 2026-09-01（火）\n\nレビュー指摘の対応。\n- 順序を入れ替え\n'
		);
	});
});

describe('journalFilename', () => {
	it('日を 2 桁にする', () => {
		expect(journalFilename('2026-09-01')).toBe('01.md');
		expect(journalFilename('2026-09-30')).toBe('30.md');
	});
});

describe('parseJournal', () => {
	it('見出しと直後の空行、末尾改行 1 個を外す', () => {
		expect(parseJournal('2026-09-01', '# 2026-09-01（火）\n\n本文\n')).toBe('本文');
	});

	it('見出しの直後に空行がなくても本文を読む', () => {
		expect(parseJournal('2026-09-01', '# 2026-09-01（火）\n本文\n')).toBe('本文');
	});

	it('見出しだけなら空', () => {
		expect(parseJournal('2026-09-01', '# 2026-09-01（火）\n')).toBe('');
	});

	it('見出しが完全に一致しなければ全体を本文として読む', () => {
		for (const text of [
			'# 2026-09-01\n\n本文\n',
			'# 2026-09-02（水）\n\n本文\n',
			'# メモ\n\n本文\n',
			'本文\n'
		]) {
			expect(parseJournal('2026-09-01', text), text).toBe(text.slice(0, -1));
		}
	});

	describe('往復', () => {
		const date = '2026-09-01';
		const bodies = [
			'本文',
			'# 本文も見出しで始まる',
			'# 2026-09-01（火）',
			'# 2026-09-01（火）\n\n日付の見出しを本文にも書いた',
			'\n先頭が空行',
			'  先頭が空白',
			'行末に空白   \nつぎの行',
			'末尾に空行\n',
			'---\nfront: matter 風'
		];
		for (const body of bodies) {
			it(JSON.stringify(body), () => {
				expect(parseJournal(date, serializeJournal(date, body))).toBe(body);
			});
		}
	});
});

describe('mergeJournals', () => {
	const month = () => emptyMonth('2026-09', CONTRACT_DEFAULTS);

	it('ファイル名の日付へ差し込む', () => {
		const { data, issues } = mergeJournals(month(), [
			{ name: '01.md', text: '# 2026-09-01（火）\n\nついたち\n' },
			{ name: '30.md', text: 'みそか\n' }
		]);
		expect(issues).toEqual([]);
		expect(data.days[0].journal).toBe('ついたち');
		expect(data.days[29].journal).toBe('みそか');
		expect(data.days[1].journal).toBe('');
	});

	it('日付として読めないファイルは読まずに報告する', () => {
		const { data, issues } = mergeJournals(month(), [
			{ name: '31.md', text: '9 月 31 日はない\n' },
			{ name: '1.md', text: '桁が足りない\n' },
			{ name: '01.txt', text: '拡張子が違う\n' },
			{ name: 'README.md', text: '\n' }
		]);
		expect(issues.map((i) => [i.code, i.params?.name])).toEqual([
			['fileUnknownJournal', '31.md'],
			['fileUnknownJournal', '1.md'],
			['fileUnknownJournal', '01.txt'],
			['fileUnknownJournal', 'README.md']
		]);
		expect(data.days.every((d) => d.journal === '')).toBe(true);
	});
});
