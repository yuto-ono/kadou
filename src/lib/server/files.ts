import { constants } from 'node:fs';
import { access, mkdir, open, readdir, rename, rm, rmdir, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** ファイルの読み書き。ドメインの規則は持たない（SPEC.md §4.5「責務の分担」） */

export interface ReadResult {
	text: string;
}

export async function readTextFile(path: string): Promise<ReadResult | null> {
	try {
		const handle = await open(path, 'r');
		try {
			return { text: await handle.readFile('utf8') };
		} finally {
			await handle.close();
		}
	} catch (e) {
		if (isNotFound(e)) return null;
		throw e;
	}
}

/**
 * 一時ファイルへ書いてからリネームする（SPEC.md §4.5「書き込み」）。
 *
 * 中断してもファイルが壊れない。一時ファイルは同じディレクトリに作る。別の
 * ファイルシステムをまたぐと rename が原子的でなくなるため。
 */
export async function writeTextFileAtomic(path: string, text: string): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const tmp = join(dirname(path), `.${Date.now()}-${process.pid}.tmp`);

	try {
		const handle = await open(tmp, 'wx');
		try {
			await handle.writeFile(text, 'utf8');
			// リネーム前に確実にディスクへ出す。ここを省くと、クラッシュ時に中身が空の
			// ファイルへ差し替わりうる
			await handle.sync();
		} finally {
			await handle.close();
		}
		await rename(tmp, path);
	} catch (e) {
		await unlink(tmp).catch(() => {});
		throw e;
	}
}

export async function deleteFile(path: string): Promise<boolean> {
	try {
		await unlink(path);
		return true;
	} catch (e) {
		if (isNotFound(e)) return false;
		throw e;
	}
}

/** 中身ごと消す。なければ何もしない */
export async function deleteDir(path: string): Promise<void> {
	await rm(path, { recursive: true, force: true });
}

/** 空のときだけ消す。中身が残っていれば、あるいはなければ何もしない */
export async function deleteDirIfEmpty(path: string): Promise<void> {
	try {
		await rmdir(path);
	} catch (e) {
		const code = (e as { code?: string }).code;
		if (code === 'ENOENT' || code === 'ENOTEMPTY' || code === 'EEXIST') return;
		throw e;
	}
}

/** ディレクトリ直下の通常ファイルの名前。サブディレクトリは含めない */
export async function listFiles(dir: string): Promise<string[]> {
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		return entries.filter((e) => e.isFile()).map((e) => e.name);
	} catch (e) {
		if (isNotFound(e)) return [];
		throw e;
	}
}

export async function exists(path: string): Promise<boolean> {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

function isNotFound(e: unknown): boolean {
	return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'ENOENT';
}
