import { parse, YAMLParseError } from 'yaml';
import { isDateString, isWeekend, monthOf } from '#lib/domain/calendar.ts';
import { CONTRACT_DEFAULTS, DAY_DEFAULTS, DAY_TYPES } from '#lib/domain/defaults.ts';
import { fromMinutes, isTimeString, parseTimeInput } from '#lib/domain/time.ts';
import type {
	ContractSnapshot,
	DayRecord,
	DayType,
	MonthData,
	MonthString,
	TimeString,
	WorkPeriod
} from '#lib/domain/types.ts';
import { issue, type Issue } from '#lib/domain/validate/issue.ts';
import { normalizeMonth } from './normalize';
import { stripOneTrailingNewline } from './scalars';

/**
 * 外枠と休憩で時刻を持っていた旧形式のフィールド（SPEC.md §4.5）。
 *
 * 読み込まないが、黙って捨てると移行し忘れた月の時刻が消えたように見えるので、
 * 残っていれば報告する。
 */
const LEGACY_FIELDS = ['startTime', 'endTime', 'breaks'] as const;

/** YAML として構文レベルで読めなかった場合。呼び出し側は 422 として扱う */
export class MonthSyntaxError extends Error {}

export interface ParsedMonth {
	data: MonthData;
	/** 手編集による不整合。データは使える状態で返し、これは警告として表示する */
	issues: Issue[];
}

/**
 * YAML テキストを月次データへ読み込む（SPEC.md §4.5）。
 *
 * 手編集を前提に寛容に読む。欠損した日は骨組みへ補い、この月に属さない日付や
 * 重複した日付は落として issue で報告する。構文エラーだけは例外にする。
 */
export function parseMonth(text: string, expectedMonth: MonthString): ParsedMonth {
	let raw: unknown;
	try {
		raw = parse(text);
	} catch (e) {
		throw new MonthSyntaxError(e instanceof YAMLParseError ? e.message : String(e));
	}

	const issues: Issue[] = [];
	const root = isRecord(raw) ? raw : {};

	if (typeof root.month === 'string' && root.month !== expectedMonth) {
		issues.push(issue('fileMonthMismatch', { field: 'month' }, { month: root.month }));
	}

	const seen = new Set<string>();
	const legacy = new Set<string>();
	const days: DayRecord[] = [];
	for (const entry of Array.isArray(root.days) ? root.days : []) {
		if (!isRecord(entry)) continue;
		const date = restoreDate(entry.date);

		if (date === null || monthOf(date) !== expectedMonth) {
			issues.push(issue('fileUnknownDate', { field: 'days' }, { date: String(entry.date) }));
			continue;
		}
		if (seen.has(date)) {
			issues.push(issue('fileDuplicateDate', { date }, { date }));
			continue;
		}
		seen.add(date);
		days.push(readDay(date, entry, issues));
		for (const field of LEGACY_FIELDS) if (field in entry) legacy.add(field);
	}

	// 日ごとに出すと月の大半の日が並ぶので、ファイルにつき 1 件にまとめる
	if (legacy.size > 0) {
		const field = [...legacy].join(' / ');
		issues.push(issue('fileLegacyField', { field: 'days' }, { field }));
	}

	return {
		data: normalizeMonth({
			month: expectedMonth,
			days,
			contract: readContract(root.contract, issues),
			remarks: readText(root.remarks)
		}),
		issues
	};
}

function readDay(date: string, entry: Record<string, unknown>, issues: Issue[]): DayRecord {
	return {
		date,
		dayType: readDayType(entry.dayType, date, issues),
		workPeriods: readPeriods(entry.workPeriods, date, issues),
		workContent: readText(entry.workContent),
		// journal は日ごとの Markdown ファイルに置く。server が mergeJournals で差し込む
		journal: DAY_DEFAULTS.journal,
		contentAutoFilled: entry.contentAutoFilled === true
	};
}

function readDayType(value: unknown, date: string, issues: Issue[]): DayType {
	if (typeof value === 'string' && (DAY_TYPES as string[]).includes(value)) return value as DayType;
	if (value !== undefined && value !== null) {
		issues.push(issue('fileFieldDropped', { date, field: 'dayType' }, { field: 'dayType' }));
	}
	// 欠損時は骨組み（emptyDay）と同じ初期値へ倒す。曜日を見ないと、ファイルに行が
	// ある土曜だけ work、行がない土曜は weekend という食い違いが出る
	return isWeekend(date) ? 'weekend' : 'work';
}

/**
 * 稼働区間の読み込み。start と end のどちらかが欠けた区間は落として報告する。
 * データには完成した区間だけを置く（SPEC.md §4.3）。
 */
function readPeriods(value: unknown, date: string, issues: Issue[]): WorkPeriod[] {
	const target = { date, field: 'workPeriods' };
	if (!Array.isArray(value)) {
		if (value !== undefined && value !== null) {
			issues.push(issue('fileFieldDropped', target, { field: 'workPeriods' }));
		}
		return [];
	}

	const periods: WorkPeriod[] = [];
	for (const entry of value) {
		const reported = issues.length;
		const start = isRecord(entry) ? readTime(entry.start, target, issues) : null;
		const end = isRecord(entry) ? readTime(entry.end, target, issues) : null;
		if (start === null || end === null) {
			// 解釈できない時刻は readTime が報告済み。欠けていた場合だけここで報告する
			if (issues.length === reported) {
				issues.push(issue('fileFieldDropped', target, { field: 'workPeriods' }));
			}
			continue;
		}
		periods.push({ start, end });
	}
	return periods;
}

function readContract(value: unknown, issues: Issue[]): ContractSnapshot {
	const c = isRecord(value) ? value : {};
	const num = (key: 'lowerHours' | 'upperHours' | 'dailyHours'): number => {
		if (typeof c[key] === 'number' && Number.isFinite(c[key])) return c[key];
		if (c[key] !== undefined) {
			issues.push(issue('fileFieldDropped', { field: `contract.${key}` }, { field: key }));
		}
		return CONTRACT_DEFAULTS[key];
	};

	return {
		workerName: readText(c.workerName),
		clientName: readText(c.clientName),
		lowerHours: num('lowerHours'),
		upperHours: num('upperHours'),
		dailyHours: num('dailyHours')
	};
}

/**
 * 時刻の復元。
 *
 * YAML 1.1 系のパーサや `%YAML 1.1` 指示行があると `12:00` が 60 進数の整数として
 * 読まれる。JSON に載せてからでは復元できないので、ここで文字列へ戻す
 * （SPEC.md §4.5「責務の分担」）。
 */
function readTime(
	value: unknown,
	target: { date?: string; field: string },
	issues: Issue[]
): TimeString | null {
	if (value === undefined || value === null) return null;

	if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 48 * 60) {
		return fromMinutes(value);
	}
	if (typeof value === 'string') {
		if (isTimeString(value)) return value;
		const parsed = parseTimeInput(value);
		if (parsed.ok && parsed.value !== null) return parsed.value;
	}

	issues.push(issue('fileFieldDropped', target, { field: target.field }));
	return null;
}

/** 日付の復元。日付型として読まれた場合に文字列へ戻す */
function restoreDate(value: unknown): string | null {
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	if (isDateString(value)) return value;
	return null;
}

/** ブロックスカラーが付けた末尾改行を剥がす。文字列以外は既定値へ倒す */
function readText(value: unknown): string {
	if (typeof value !== 'string') return DAY_DEFAULTS.workContent;
	return stripOneTrailingNewline(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
