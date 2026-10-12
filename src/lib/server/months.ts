import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { DAY_DEFAULTS } from '$lib/domain/defaults';
import type { MonthData } from '$lib/domain/types';
import {
	journalFilename,
	mergeJournals,
	serializeJournal,
	type JournalFile
} from '$lib/persistence/journal';
import { parseMonth, type ParsedMonth } from '$lib/persistence/month-parse';
import { serializeMonth } from '$lib/persistence/month-serialize';
import { normalizeMonth } from '$lib/persistence/normalize';
import {
	deleteDir,
	deleteDirIfEmpty,
	deleteFile,
	listFiles,
	readTextFile,
	writeTextFileAtomic
} from './files';
import { journalDir, monthFromFilename, monthPath, monthsDir } from './paths';

/** 直近の月から降順（SPEC.md §4.4）。年数が増えることを前提にする */
export async function listMonths(): Promise<string[]> {
	const names = await listFiles(monthsDir());
	return names
		.map(monthFromFilename)
		.filter((m): m is string => m !== null)
		.sort()
		.reverse();
}

/** 月の YAML に、日ごとの journal のファイルを差し込んで返す（SPEC.md §4.5） */
export async function readMonth(month: string): Promise<ParsedMonth | null> {
	const file = await readTextFile(monthPath(month));
	if (file === null) return null;

	const parsed = parseMonth(file.text, month);
	const merged = mergeJournals(parsed.data, await readJournalFiles(month));
	return { data: merged.data, issues: [...parsed.issues, ...merged.issues] };
}

async function readJournalFiles(month: string): Promise<JournalFile[]> {
	const dir = journalDir(month);
	// ドットファイルは journal ではない。.DS_Store や書き込み途中の一時ファイル
	const names = (await listFiles(dir)).filter((name) => !name.startsWith('.'));
	const files: JournalFile[] = [];
	for (const name of names) {
		const file = await readTextFile(join(dir, name));
		if (file !== null) files.push({ name, text: file.text });
	}
	return files;
}

export class RoundTripError extends Error {}

/**
 * 月次データを書き出す。
 *
 * 直列化した YAML を読み戻し、元と一致することを確かめてから置き換える
 * （SPEC.md §4.5「責務の分担」）。
 *
 * 捕まえたいのは YAML 特有の「書けたが読み戻すと別物」という壊れ方。作業内容に
 * `: ` が含まれる、`No` や `Off` と書いた文字列が真偽値として読み戻る、remarks の
 * 末尾空白がブロックスカラーで落ちる、といった類。壊れたまま書き込むと、客先へ
 * 出す報告書が黙って変わる。
 *
 * journal は日ごとの Markdown ファイルへ書く。本文を生のまま書くだけなので自己
 * 検証はかけない。ファイルごとに置き換え、月全体としての原子性は持たない。日を
 * またぐ整合性がないため、中断しても書けた日と書けなかった日が分かれるだけで済む。
 */
export async function writeMonth(month: string, data: MonthData): Promise<void> {
	const normalized = normalizeMonth({ ...data, month });
	if (normalized.days.some((day) => typeof day.journal !== 'string')) {
		throw new RoundTripError(`${month} の journal が文字列ではありません`);
	}

	const text = serializeMonth(normalized);
	const back = parseMonth(text, month);
	const withoutJournal = {
		...normalized,
		days: normalized.days.map((day) => ({ ...day, journal: DAY_DEFAULTS.journal }))
	};
	if (!isDeepStrictEqual(back.data, withoutJournal)) {
		throw new RoundTripError(`${month} の直列化が往復しません`);
	}

	await writeTextFileAtomic(monthPath(month), text);
	await writeJournals(month, normalized);
}

/** journal が空の日はファイルを置かない。空にした日はファイルを消す */
async function writeJournals(month: string, data: MonthData): Promise<void> {
	const dir = journalDir(month);
	const existing = new Set(await listFiles(dir));

	for (const day of data.days) {
		const name = journalFilename(day.date);
		if (day.journal !== DAY_DEFAULTS.journal) {
			await writeTextFileAtomic(join(dir, name), serializeJournal(day.date, day.journal));
		} else if (existing.has(name)) {
			await deleteFile(join(dir, name));
		}
	}

	// 1 日も書いていない月にディレクトリだけ残さない
	await deleteDirIfEmpty(dir);
}

/** 月の YAML と journal のディレクトリをまとめて消す（SPEC.md §4.4） */
export async function deleteMonth(month: string): Promise<boolean> {
	const deleted = await deleteFile(monthPath(month));
	await deleteDir(journalDir(month));
	return deleted;
}
