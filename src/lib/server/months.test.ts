import { mkdtemp, readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emptyMonth } from '$lib/domain/calendar';
import { CONTRACT_DEFAULTS } from '$lib/domain/defaults';
import type { MonthData } from '$lib/domain/types';
import { MonthSyntaxError } from '$lib/persistence/month-parse';
import { deleteMonth, listMonths, readMonth, RoundTripError, writeMonth } from './months';

let dir: string;
const original = process.env.KADOU_DATA_DIR;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), 'kadou-'));
	process.env.KADOU_DATA_DIR = dir;
});

afterEach(() => {
	if (original === undefined) delete process.env.KADOU_DATA_DIR;
	else process.env.KADOU_DATA_DIR = original;
});

function september(): MonthData {
	const m = emptyMonth('2026-09', {
		...CONTRACT_DEFAULTS,
		workerName: '山田 太郎',
		clientName: '客先'
	});
	m.days[0] = {
		...m.days[0],
		workPeriods: [
			{ start: '09:30', end: '12:00' },
			{ start: '13:00', end: '19:00' }
		],
		workContent: '認証: 基盤の改修',
		journal: 'メモ\n- 続き'
	};
	return m;
}

describe('listMonths', () => {
	it('ディレクトリがなくても空を返す', async () => {
		expect(await listMonths()).toEqual([]);
	});

	it('直近の月から降順に並べる', async () => {
		await mkdir(join(dir, 'months'));
		for (const name of ['2025-12.yaml', '2026-09.yaml', '2026-01.yaml']) {
			await writeFile(join(dir, 'months', name), '');
		}
		expect(await listMonths()).toEqual(['2026-09', '2026-01', '2025-12']);
	});

	it('月次データ以外のファイルを無視する', async () => {
		await mkdir(join(dir, 'months'));
		await writeFile(join(dir, 'months', 'README.md'), '');
		await writeFile(join(dir, 'months', '2026-09.yaml'), '');
		expect(await listMonths()).toEqual(['2026-09']);
	});

	it('中身が壊れていても一覧には出す', async () => {
		await mkdir(join(dir, 'months'));
		await writeFile(join(dir, 'months', '2026-09.yaml'), 'days:\n  - [unclosed\n');
		expect(await listMonths()).toEqual(['2026-09']);
		await expect(readMonth('2026-09')).rejects.toThrow(MonthSyntaxError);
	});
});

describe('writeMonth / readMonth', () => {
	it('書いて読み戻すと一致する', async () => {
		const m = september();
		await writeMonth('2026-09', m);
		const parsed = await readMonth('2026-09');
		expect(parsed?.data).toEqual(m);
		expect(parsed?.issues).toEqual([]);
	});

	it('存在しない月は null', async () => {
		expect(await readMonth('2026-09')).toBeNull();
	});

	it('months/ を作ってから書く', async () => {
		await writeMonth('2026-09', september());
		expect(await readdir(join(dir, 'months'))).toEqual(['2026-09.yaml']);
	});

	it('一時ファイルを残さない', async () => {
		await writeMonth('2026-09', september());
		await writeMonth('2026-09', september());
		expect(await readdir(join(dir, 'months'))).toEqual(['2026-09.yaml']);
	});

	it('書き出す先の month をパスに合わせる', async () => {
		const m = { ...september(), month: '2026-08' };
		await writeMonth('2026-09', m);
		const text = await readFile(join(dir, 'months', '2026-09.yaml'), 'utf8');
		expect(text).toContain('month: "2026-09"');
	});

	it('正規化してから書く（欠けた日を補う）', async () => {
		const m = september();
		m.days = m.days.slice(0, 3);
		await writeMonth('2026-09', m);
		expect((await readMonth('2026-09'))?.data.days).toHaveLength(30);
	});

	it('月として妥当でない名前は書けない', async () => {
		await expect(writeMonth('../escape', september())).rejects.toThrow();
	});
});

describe('自己検証', () => {
	it('直列化が往復しない場合は書き込まない', async () => {
		const m = september();
		// 直列化を通らない値を差し込み、rename の前に落ちることを確かめる
		(m.days[1] as unknown as { workContent: unknown }).workContent = { 壊れた: '値' };

		await expect(writeMonth('2026-09', m)).rejects.toThrow(RoundTripError);
		expect(await readdir(join(dir, 'months')).catch(() => [])).toEqual([]);
	});

	it('既存のファイルを壊れた内容で置き換えない', async () => {
		await writeMonth('2026-09', september());
		const before = await readFile(join(dir, 'months', '2026-09.yaml'), 'utf8');

		const broken = september();
		(broken.days[1] as unknown as { workContent: unknown }).workContent = { 壊れた: '値' };
		await expect(writeMonth('2026-09', broken)).rejects.toThrow(RoundTripError);

		expect(await readFile(join(dir, 'months', '2026-09.yaml'), 'utf8')).toBe(before);
	});
});

describe('deleteMonth', () => {
	it('消せたら true、なければ false', async () => {
		await writeMonth('2026-09', september());
		expect(await deleteMonth('2026-09')).toBe(true);
		expect(await deleteMonth('2026-09')).toBe(false);
	});
});
