import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emptyMonth } from '$lib/domain/calendar';
import { CONTRACT_DEFAULTS } from '$lib/domain/defaults';
import type { MonthData } from '$lib/domain/types';
import { MonthSyntaxError, parseMonth } from './month-parse';
import { serializeMonth } from './month-serialize';
import { normalizeMonth } from './normalize';

const fixture = (name: string) =>
	readFileSync(`src/lib/persistence/fixtures/${name}.yaml`, 'utf8');

describe('SPEC の実例（§4.5）', () => {
	const { data, issues } = parseMonth(fixture('spec-example'), '2026-09');

	it('警告なしで読める', () => {
		expect(issues).toEqual([]);
	});

	it('契約スナップショットを読む', () => {
		expect(data.contract).toEqual({
			workerName: '山田 太郎',
			clientName: '株式会社サンプル',
			lowerHours: 140,
			upperHours: 180,
			dailyHours: 8
		});
	});

	it('ブロックスカラーの末尾改行を剥がす', () => {
		expect(data.remarks).toBe('祝日が重なり、想定稼働が精算幅の下限を下回っています。');
		expect(data.days[0].journal).toBe(
			'レビュー指摘の対応。\n- トークン検証の順序を入れ替え\n- 移行手順は次週あらためて相談'
		);
	});

	it('日次の値を読む', () => {
		expect(data.days[0]).toEqual({
			date: '2026-09-01',
			dayType: 'work',
			startTime: '09:30',
			endTime: '19:00',
			breaks: [{ start: '12:00', end: '13:00' }],
			workContent: '認証基盤のリファクタリング',
			journal: 'レビュー指摘の対応。\n- トークン検証の順序を入れ替え\n- 移行手順は次週あらためて相談',
			contentAutoFilled: false
		});
	});

	it('ファイルにない日を補う（SPEC.md §4.4「全日分を保持」）', () => {
		expect(data.days).toHaveLength(30);
		expect(data.days[1]).toMatchObject({ date: '2026-09-02', dayType: 'work', startTime: null });
		// 補った日も曜日から土日を判定する
		expect(data.days[4]).toMatchObject({ date: '2026-09-05', dayType: 'weekend' });
	});
});

describe('serializeMonth', () => {
	function rich(): MonthData {
		const m = emptyMonth('2026-09', {
			...CONTRACT_DEFAULTS,
			workerName: '山田 太郎',
			clientName: '客先'
		});
		m.remarks = '祝日が重なりました。';
		m.days[0] = {
			...m.days[0],
			startTime: '09:30',
			endTime: '26:00',
			breaks: [
				{ start: '12:00', end: '13:00' },
				{ start: '25:00', end: '25:30' }
			],
			workContent: '認証基盤のリファクタリング',
			journal: 'レビュー指摘の対応。\n- 順序を入れ替え'
		};
		m.days[20] = { ...m.days[20], dayType: 'holiday', workContent: '祝日', contentAutoFilled: true };
		return m;
	}

	it('既定値と同じフィールドを書き出さない', () => {
		const text = serializeMonth(rich());
		// 土日の行は date と dayType の 2 行に収まる
		expect(text).toContain('  - date: "2026-09-05"\n    dayType: weekend\n  - date: "2026-09-06"');
	});

	it('時刻と日付をすべてクォートする（SPEC.md §4.5）', () => {
		const text = serializeMonth(rich());
		for (const line of text.split('\n')) {
			const m = /^\s*(?:- )?(month|date|startTime|endTime|start|end): (.*)$/.exec(line);
			if (m) expect(m[2], line).toMatch(/^".*"$/);
		}
	});

	it('journal と remarks をブロックスカラーで書く', () => {
		const text = serializeMonth(rich());
		expect(text).toContain('remarks: |\n  祝日が重なりました。\n');
		expect(text).toContain('journal: |\n      レビュー指摘の対応。\n      - 順序を入れ替え\n');
	});

	it('contentAutoFilled は true のときだけ書く', () => {
		const text = serializeMonth(rich());
		expect(text.match(/contentAutoFilled/g)).toHaveLength(1);
	});

	describe('往復', () => {
		it('parse(serialize(d)) が d と一致する', () => {
			const m = rich();
			expect(parseMonth(serializeMonth(m), '2026-09').data).toEqual(m);
		});

		it('2 度書き出しても同じテキストになる', () => {
			const once = serializeMonth(rich());
			const twice = serializeMonth(parseMonth(once, '2026-09').data);
			expect(twice).toBe(once);
		});

		it('YAML として別物に読み戻る値を含めても往復する', () => {
			const m = emptyMonth('2026-01', CONTRACT_DEFAULTS);
			const fragile = [
				'認証: 基盤の改修',
				'No',
				'Off',
				'~',
				'null',
				'true',
				'123',
				'- 箇条書き風',
				'# 見出し風',
				'  前後に空白  ',
				'末尾にコロン:',
				'"引用符つき"'
			];
			fragile.forEach((v, i) => (m.days[i] = { ...m.days[i], workContent: v }));
			m.days[20] = { ...m.days[20], journal: '行末に空白   \nつぎの行' };
			m.days[21] = { ...m.days[21], journal: '末尾に空行\n' };
			m.days[22] = { ...m.days[22], journal: '  先頭が空白' };

			expect(parseMonth(serializeMonth(m), '2026-01').data).toEqual(m);
		});
	});
});

describe('normalizeMonth', () => {
	it('休憩区間を start の昇順へ並べる', () => {
		const m = emptyMonth('2026-09', CONTRACT_DEFAULTS);
		m.days[0] = {
			...m.days[0],
			breaks: [
				{ start: '15:00', end: '15:15' },
				{ start: '12:00', end: '13:00' }
			]
		};
		expect(normalizeMonth(m).days[0].breaks.map((b) => b.start)).toEqual(['12:00', '15:00']);
	});

	it('冪等', () => {
		const once = normalizeMonth(emptyMonth('2026-09', CONTRACT_DEFAULTS));
		expect(normalizeMonth(once)).toEqual(once);
	});
});

describe('手で編集されたファイルの防御', () => {
	it('YAML 1.1 で 60 進数・日付型として読まれた値を文字列へ戻す', () => {
		const { data } = parseMonth(fixture('yaml11'), '2026-09');
		expect(data.days[0]).toMatchObject({
			date: '2026-09-01',
			startTime: '12:00',
			endTime: '21:30'
		});
	});

	it('この月に属さない日付を落として報告する', () => {
		const { data, issues } = parseMonth(fixture('broken'), '2026-09');
		expect(issues.map((i) => i.code)).toContain('fileUnknownDate');
		expect(data.days.every((d) => d.date.startsWith('2026-09'))).toBe(true);
	});

	it('重複した日付は最初のものを採って報告する', () => {
		const { data, issues } = parseMonth(fixture('broken'), '2026-09');
		expect(issues.map((i) => i.code)).toContain('fileDuplicateDate');
		expect(data.days[0].dayType).toBe('work');
	});

	it('解釈できない値は既定値へ倒して報告する', () => {
		const { data, issues } = parseMonth(fixture('broken'), '2026-09');
		const dropped = issues.filter((i) => i.code === 'fileFieldDropped');
		expect(dropped.map((i) => i.target.field)).toEqual(
			expect.arrayContaining(['dayType', 'startTime'])
		);
		expect(data.days[2]).toMatchObject({ date: '2026-09-03', dayType: 'work', startTime: null });
	});

	it('month がファイル名と食い違えば報告する', () => {
		const { issues } = parseMonth('month: "2026-08"\ndays: []\n', '2026-09');
		expect(issues.map((i) => i.code)).toContain('fileMonthMismatch');
	});

	it('空のファイルでも月の骨組みを返す', () => {
		const { data } = parseMonth('', '2026-09');
		expect(data.days).toHaveLength(30);
		expect(data.contract).toEqual({
			workerName: '',
			clientName: '',
			lowerHours: 140,
			upperHours: 180,
			dailyHours: 8
		});
	});

	it('構文エラーは例外にする', () => {
		expect(() => parseMonth('days:\n  - [unclosed\n', '2026-09')).toThrow(MonthSyntaxError);
	});
});
