import { Scalar } from 'yaml';

/**
 * YAML のスカラー表現の制御。
 *
 * 既定の stringify 任せにすると、時刻と日付の強制クォート（SPEC.md §4.5）や
 * remarks のブロックスカラーを指定できない。
 */

/**
 * 二重引用符で囲む。時刻と日付に使う。
 *
 * パーサとそのバージョンによっては `12:00` が 60 進数の整数、`2026-09-01` が
 * 日付型として解釈される。クォートしておけば実装を選ばない（SPEC.md §4.5）。
 */
export function quoted(value: string): Scalar<string> {
	const node = new Scalar(value);
	node.type = Scalar.QUOTE_DOUBLE;
	return node;
}

/**
 * ブロックスカラー（`|`）で書く。remarks に使う。
 *
 * 複数行を生のまま書けるため、git の diff が通常の文章として読める。
 * 末尾改行を 1 個だけ付けて clip（`|`）にする。データとしては末尾改行なしで保持
 * し、読み込み時に 1 個剥がす（SPEC.md §4.5）。決めておかないと、読んで書き直す
 * だけで末尾の改行が増減して diff に現れる。
 */
export function blockLiteral(value: string): Scalar<string> {
	const node = new Scalar(`${value}\n`);
	node.type = Scalar.BLOCK_LITERAL;
	return node;
}

/** blockLiteral が付けた末尾改行を 1 個だけ剥がす */
export function stripOneTrailingNewline(value: string): string {
	return value.endsWith('\n') ? value.slice(0, -1) : value;
}
