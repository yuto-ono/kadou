import type { Minutes, TimeString } from './types';

/**
 * 時刻の表現（SPEC.md §5.1 / §8「時刻入力の形式」）。
 *
 * 内部表現は `HH:MM` 文字列で、24 時超え（`26:00`）を許容する。24 時超えを翌日
 * 表記へ変換するのは報告書の出力時だけで、保持するデータは変換しない。
 */

/** 時の上限。`maxEndTime` の設定範囲が 24:00〜47:59 のため（SPEC.md §4.1） */
const MAX_HOUR = 47;

const HHMM = /^(\d{2}):(\d{2})$/;

export type TimeParseFailure = 'format' | 'hour' | 'minute';

export type TimeParseResult =
	/** value が null なら空入力（値のクリア） */
	| { ok: true; value: TimeString | null }
	| { ok: false; reason: TimeParseFailure };

/** 全角の数字とコロンを半角へ畳む。日本語入力では確実に混入する（SPEC.md §8） */
function toHalfWidth(raw: string): string {
	return raw.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/：/g, ':');
}

function compose(hour: number, minute: number): TimeParseResult {
	if (!Number.isInteger(hour) || !Number.isInteger(minute)) return { ok: false, reason: 'format' };
	if (minute >= 60) return { ok: false, reason: 'minute' };
	if (hour > MAX_HOUR) return { ok: false, reason: 'hour' };
	return { ok: true, value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
}

/**
 * 入力された文字列を `HH:MM` へ正規化する（SPEC.md §8「時刻入力の形式」）。
 *
 * 見るのは書式だけで、範囲（開始は 0:00〜23:59、終了は maxEndTime 以下）は
 * 検証しない。maxEndTime は契約設定の値で、時刻の書式とは無関係のため。
 */
export function parseTimeInput(raw: string): TimeParseResult {
	const s = toHalfWidth(raw).trim();
	if (s === '') return { ok: true, value: null };

	if (s.includes(':')) {
		const [h, m = '0'] = s.split(':');
		if (!/^\d{1,2}$/.test(h) || !/^\d{1,2}$/.test(m || '0')) return { ok: false, reason: 'format' };
		return compose(Number(h), Number(m === '' ? '0' : m));
	}

	if (!/^\d{1,4}$/.test(s)) return { ok: false, reason: 'format' };
	// 1〜2 桁は時のみ、3 桁は H:MM、4 桁は HH:MM
	if (s.length <= 2) return compose(Number(s), 0);
	return compose(Number(s.slice(0, s.length - 2)), Number(s.slice(-2)));
}

/** 保持しているデータが `HH:MM` として妥当か。手編集された YAML の防御に使う */
export function isTimeString(value: unknown): value is TimeString {
	if (typeof value !== 'string') return false;
	const m = HHMM.exec(value);
	return m !== null && Number(m[2]) < 60 && Number(m[1]) <= MAX_HOUR;
}

export function toMinutes(time: TimeString): Minutes {
	const m = HHMM.exec(time);
	if (!m) throw new Error(`時刻として解釈できない: ${time}`);
	return Number(m[1]) * 60 + Number(m[2]);
}

export function fromMinutes(total: Minutes): TimeString {
	const h = Math.floor(total / 60);
	const m = total % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 長さの表記。`1:00` / `152:30`。時はゼロ埋めしない（SPEC.md §7.1「数値の書式」） */
export function formatDuration(total: Minutes): string {
	const sign = total < 0 ? '-' : '';
	const abs = Math.abs(total);
	return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}

/** 符号付きの長さ。ペース差分など、貯金か借金かを示す値に使う（SPEC.md §5.2） */
export function formatSignedDuration(total: Minutes): string {
	return total > 0 ? `+${formatDuration(total)}` : formatDuration(total);
}

/**
 * 報告書用に 24 時超えを翌日表記へ変換する（SPEC.md §7.1）。
 *
 * `26:00` → `翌2:00`、`24:00` → `翌0:00`。24 時未満はそのまま。
 * 24 時超えの表記は勤怠管理に馴染みのない読み手に通じにくく、報告書は客先が
 * 読むものであるため。画面側は `26:00` のまま扱う。
 */
export function toReportTime(time: TimeString): string {
	const minutes = toMinutes(time);
	if (minutes < 24 * 60) return time;
	const rest = minutes - 24 * 60;
	return `翌${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`;
}
