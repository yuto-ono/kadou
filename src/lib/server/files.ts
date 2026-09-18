import { constants } from 'node:fs';
import { access, mkdir, open, readdir, rename, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** ファイルの読み書き。ドメインの規則は持たない（SPEC.md §4.5「責務の分担」） */

export interface ReadResult {
	text: string;
	/** 将来 If-Unmodified-Since を足せるように返しておく */
	mtimeMs: number;
}

export async function readTextFile(path: string): Promise<ReadResult | null> {
	try {
		const handle = await open(path, 'r');
		try {
			const [text, stat] = await Promise.all([handle.readFile('utf8'), handle.stat()]);
			return { text, mtimeMs: stat.mtimeMs };
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

export async function listFiles(dir: string): Promise<string[]> {
	try {
		return await readdir(dir);
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
