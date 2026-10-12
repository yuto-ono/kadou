import { isDateString, monthOf, weekdayLabel } from '$lib/domain/calendar';
import type { DateString, MonthData, MonthString } from '$lib/domain/types';
import { issue, type Issue } from '$lib/domain/validate/issue';
import { stripOneTrailingNewline } from './scalars';

/**
 * journal の Markdown ファイル（SPEC.md §4.5「journal のファイル」）。
 *
 * 1 日 1 ファイル。1 行目に日付の見出しを付け、空行を挟んで本文を生のまま書く。
 * 見出しはファイル形式の都合で、データには含めない。
 */

/** `months/YYYY-MM/` の下でのファイル名 */
export function journalFilename(date: DateString): string {
	return `${date.slice(8, 10)}.md`;
}

function heading(date: DateString): string {
	return `# ${date}（${weekdayLabel(date)}）`;
}

/** 末尾改行は remarks と同じく 1 個だけ付ける（SPEC.md §4.5） */
export function serializeJournal(date: DateString, body: string): string {
	return `${heading(date)}\n\n${body}\n`;
}

/**
 * 見出しを外すのは 1 行目がその日の見出しと完全に一致する場合だけ。一致しなければ
 * 全体を本文として読む。書式を問わず外すと、手編集で見出しを消したファイルの
 * 本文が `#` で始まっていたとき、その行が消える。
 */
export function parseJournal(date: DateString, text: string): string {
	const body = stripOneTrailingNewline(text);
	const head = heading(date);
	if (body === head) return '';
	if (!body.startsWith(`${head}\n`)) return body;

	const rest = body.slice(head.length + 1);
	return rest.startsWith('\n') ? rest.slice(1) : rest;
}

export interface JournalFile {
	name: string;
	text: string;
}

/**
 * 月次データへ journal のファイル群を差し込む。
 *
 * ファイル名が `DD.md` の形でない、またはその月に存在しない日付のファイルは読まず
 * に報告する。
 */
export function mergeJournals(
	data: MonthData,
	files: JournalFile[]
): { data: MonthData; issues: Issue[] } {
	const issues: Issue[] = [];
	const bodies = new Map<DateString, string>();

	for (const file of files) {
		const date = dateFromFilename(data.month, file.name);
		if (date === null) {
			issues.push(issue('fileUnknownJournal', { field: 'journal' }, { name: file.name }));
			continue;
		}
		bodies.set(date, parseJournal(date, file.text));
	}

	return {
		data: {
			...data,
			days: data.days.map((day) =>
				bodies.has(day.date) ? { ...day, journal: bodies.get(day.date)! } : day
			)
		},
		issues
	};
}

function dateFromFilename(month: MonthString, name: string): DateString | null {
	const m = /^(\d{2})\.md$/.exec(name);
	if (!m) return null;
	const date = `${month}-${m[1]}`;
	return isDateString(date) && monthOf(date) === month ? date : null;
}
