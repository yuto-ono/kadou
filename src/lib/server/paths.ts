import { isAbsolute, join, resolve, sep } from 'node:path';

/**
 * データディレクトリとファイルパスの解決（SPEC.md §4.5「配置」）。
 *
 *   contract.yaml
 *   months/2026-09.yaml
 *   months/2026-09/01.md   journal（SPEC.md §4.5「journal のファイル」）
 *
 * 場所は起動時に指定し、既定はカレントディレクトリ。アプリのソースと作業記録を
 * 別のリポジトリに置けるようにするため。
 */

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export class InvalidMonthError extends Error {}

export function dataDir(): string {
	const configured = process.env.KADOU_DATA_DIR;
	if (!configured) return process.cwd();
	return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

export function monthsDir(): string {
	return join(dataDir(), 'months');
}

export function contractPath(): string {
	return join(dataDir(), 'contract.yaml');
}

/**
 * 月次データのパス。
 *
 * ルートの param matcher で検証済みだが、ここでも縛る。API を直接叩かれる経路が
 * ある以上、パスを組み立てる場所が最後の砦になる。
 */
export function monthPath(month: string): string {
	if (!MONTH_PATTERN.test(month)) throw new InvalidMonthError(month);

	const path = join(monthsDir(), `${month}.yaml`);
	// 正規表現を通っていれば到達しないが、多重防御として実際のパスも確かめる
	if (!resolve(path).startsWith(resolve(monthsDir()) + sep)) throw new InvalidMonthError(month);
	return path;
}

/** その月の journal を置くディレクトリ。月の YAML の隣に置く */
export function journalDir(month: string): string {
	return monthPath(month).replace(/\.yaml$/, '');
}

/** ファイル名から月の一覧を作る。中身が壊れていても一覧には出る */
export function monthFromFilename(name: string): string | null {
	const m = /^(\d{4}-(?:0[1-9]|1[0-2]))\.yaml$/.exec(name);
	return m ? m[1] : null;
}
