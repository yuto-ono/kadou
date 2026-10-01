/**
 * 旧形式（startTime / endTime / breaks）の月次データを workPeriods へ変換する
 * 一度きりの移行スクリプト（SPEC-REVISION-WORK-ENTRY.md §9）。
 *
 *   node scripts/migrate-work-periods.js [データディレクトリ] [--write]
 *
 * 既定は差分を表示するだけで、--write を付けたときだけ書き換える。1 件でも変換
 * できない日があれば、どのファイルも書き換えない。バックアップは作業記録リポジ
 * トリの git が担うので、実行前にコミットしておくこと。
 *
 * アプリの persistence/ を使わないのは、アプリが旧形式を読まないため。YAML の
 * 書式（クォート・ブロックスカラー）は元のファイルのまま残し、変えるのは時刻の
 * フィールドだけにする。
 */
import { readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMap, isSeq, Pair, parseDocument, Scalar, YAMLSeq } from 'yaml';

const LEGACY_FIELDS = ['startTime', 'endTime', 'breaks'];

export class MigrationError extends Error {}

/** `HH:MM` を分へ。24 時超え表記を許容する */
function toMinutes(value, where) {
	const m = typeof value === 'string' ? /^(\d{2}):(\d{2})$/.exec(value) : null;
	if (m === null || Number(m[2]) >= 60) throw new MigrationError(`${where}: 時刻として読めません（${value}）`);
	return Number(m[1]) * 60 + Number(m[2]);
}

function fromMinutes(total) {
	return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * 開始〜終了から休憩を除いた区間を返す。
 *
 * 休憩が開始・終了に接していれば長さ 0 の区間ができるので落とす（報告書の
 * 開始・終了がずれるが、実態に近づくので受け入れる）。隣接する休憩は 1 つの
 * 空き時間になる。検証エラーを含む日は補正せず例外にする。
 */
export function toWorkPeriods(startTime, endTime, breaks, date) {
	const where = (field) => `${date} の ${field}`;
	if (startTime == null && endTime == null) {
		if (breaks.length > 0) throw new MigrationError(`${date}: 開始・終了がないのに休憩があります`);
		return [];
	}
	if (startTime == null || endTime == null) {
		throw new MigrationError(`${date}: 開始と終了の片方しかありません`);
	}

	const start = toMinutes(startTime, where('startTime'));
	const end = toMinutes(endTime, where('endTime'));
	if (end <= start) throw new MigrationError(`${date}: 終了が開始より後ではありません`);

	const spans = breaks
		.map((b, i) => ({ from: toMinutes(b.start, where(`breaks[${i}].start`)), to: toMinutes(b.end, where(`breaks[${i}].end`)) }))
		.sort((a, b) => a.from - b.from);

	let cursor = start;
	const periods = [];
	for (const { from, to } of spans) {
		if (to <= from) throw new MigrationError(`${date}: 長さ 0 以下の休憩があります`);
		if (from < start || to > end) throw new MigrationError(`${date}: 稼働時間帯の外に休憩があります`);
		if (from < cursor) throw new MigrationError(`${date}: 休憩が重なっています`);
		if (from > cursor) periods.push({ start: fromMinutes(cursor), end: fromMinutes(from) });
		cursor = to;
	}
	if (end > cursor) periods.push({ start: fromMinutes(cursor), end: fromMinutes(end) });
	if (periods.length === 0) throw new MigrationError(`${date}: 休憩が稼働時間帯をすべて覆っています`);
	return periods;
}

function quoted(value) {
	const s = new Scalar(value);
	s.type = Scalar.QUOTE_DOUBLE;
	return s;
}

/**
 * 1 ファイル分の YAML テキストを変換する。旧形式のフィールドがなければ null。
 *
 * workPeriods は、旧形式のフィールドがあった位置（最初のもの）に差し込む。
 */
export function migrateMonthText(text) {
	const doc = parseDocument(text);
	if (doc.errors.length > 0) throw new MigrationError(doc.errors[0].message);

	const days = doc.get('days');
	if (!isSeq(days)) return null;

	let changed = false;
	for (const day of days.items) {
		if (!isMap(day)) continue;
		const index = day.items.findIndex((pair) => LEGACY_FIELDS.includes(String(pair.key)));
		if (index < 0) continue;

		const date = String(day.get('date'));
		const breaks = day.get('breaks')?.toJSON?.() ?? [];
		if (day.has('workPeriods')) throw new MigrationError(`${date}: 旧形式と workPeriods が混在しています`);
		const periods = toWorkPeriods(day.get('startTime') ?? null, day.get('endTime') ?? null, breaks, date);

		const seq = new YAMLSeq();
		for (const p of periods) {
			const item = doc.createNode({});
			item.set('start', quoted(p.start));
			item.set('end', quoted(p.end));
			seq.items.push(item);
		}

		day.items = day.items.filter((pair) => !LEGACY_FIELDS.includes(String(pair.key)));
		// 稼働区間のない日は既定値（空配列）なので書き出さない（SPEC.md §4.5）
		if (periods.length > 0) day.items.splice(index, 0, new Pair(new Scalar('workPeriods'), seq));
		changed = true;
	}

	return changed ? doc.toString({ lineWidth: 0 }) : null;
}

async function main(argv) {
	const write = argv.includes('--write');
	const dataDir = resolve(argv.find((a) => !a.startsWith('--')) ?? process.env.KADOU_DATA_DIR ?? '.');
	const monthsDir = join(dataDir, 'months');
	const names = (await readdir(monthsDir)).filter((n) => /^\d{4}-\d{2}\.yaml$/.test(n)).sort();

	const results = [];
	const errors = [];
	for (const name of names) {
		const path = join(monthsDir, name);
		try {
			const next = migrateMonthText(await readFile(path, 'utf8'));
			results.push({ name, path, next });
		} catch (e) {
			errors.push(`${name}: ${e.message}`);
		}
	}

	for (const { name, next } of results) console.log(`${next === null ? '変更なし' : '変換する'}  ${name}`);
	if (errors.length > 0) {
		console.error('\n変換できない日があります。手で直してから再実行してください。どのファイルも書き換えていません。');
		for (const e of errors) console.error(`  ${e}`);
		process.exitCode = 1;
		return;
	}
	if (!write) {
		console.log('\n確認のみ。書き換えるには --write を付けて再実行してください。');
		return;
	}

	for (const { path, next } of results) {
		if (next === null) continue;
		// アプリの書き込みと同じく、一時ファイルを経由して置き換える
		await writeFile(`${path}.tmp`, next, 'utf8');
		await rename(`${path}.tmp`, path);
	}
	console.log(`\n${results.filter((r) => r.next !== null).length} 件を書き換えました。`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await main(process.argv.slice(2));
}
