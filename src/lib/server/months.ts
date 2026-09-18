import { isDeepStrictEqual } from 'node:util';
import type { MonthData } from '$lib/domain/types';
import { parseMonth, type ParsedMonth } from '$lib/persistence/month-parse';
import { serializeMonth } from '$lib/persistence/month-serialize';
import { normalizeMonth } from '$lib/persistence/normalize';
import { deleteFile, listFiles, readTextFile, writeTextFileAtomic } from './files';
import { monthFromFilename, monthPath, monthsDir } from './paths';

/** 直近の月から降順（SPEC.md §4.4）。年数が増えることを前提にする */
export async function listMonths(): Promise<string[]> {
	const names = await listFiles(monthsDir());
	return names
		.map(monthFromFilename)
		.filter((m): m is string => m !== null)
		.sort()
		.reverse();
}

export async function readMonth(month: string): Promise<ParsedMonth | null> {
	const file = await readTextFile(monthPath(month));
	return file === null ? null : parseMonth(file.text, month);
}

export class RoundTripError extends Error {}

/**
 * 月次データを書き出す。
 *
 * 直列化した YAML を読み戻し、元と一致することを確かめてから置き換える
 * （SPEC.md §4.5「責務の分担」）。
 *
 * 捕まえたいのは YAML 特有の「書けたが読み戻すと別物」という壊れ方。作業内容に
 * `: ` が含まれる、`No` や `Off` と書いた文字列が真偽値として読み戻る、journal の
 * 末尾空白がブロックスカラーで落ちる、といった類。壊れたまま書き込むと、客先へ
 * 出す報告書が黙って変わる。
 */
export async function writeMonth(month: string, data: MonthData): Promise<void> {
	const normalized = normalizeMonth({ ...data, month });
	const text = serializeMonth(normalized);

	const back = parseMonth(text, month);
	if (!isDeepStrictEqual(back.data, normalized)) {
		throw new RoundTripError(`${month} の直列化が往復しません`);
	}

	await writeTextFileAtomic(monthPath(month), text);
}

export async function deleteMonth(month: string): Promise<boolean> {
	return deleteFile(monthPath(month));
}
