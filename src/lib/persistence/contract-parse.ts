import { parse, YAMLParseError } from 'yaml';
import { CONTRACT_DEFAULTS } from '#lib/domain/defaults.ts';
import { isTimeString, parseTimeInput } from '#lib/domain/time.ts';
import type { Contract } from '#lib/domain/types.ts';

/** contract.yaml が YAML として読めなかった場合 */
export class ContractSyntaxError extends Error {}

/**
 * contract.yaml を読み込む（SPEC.md §4.1 / §4.5）。
 *
 * ここでは型を整えるだけで、値の妥当性（空でない、下限 ≦ 上限、など）は
 * domain/validate/contract.ts が見る。表示と月の新規作成の制御に使うため、
 * 不正な値もそのまま持ち上げる必要がある。
 */
export function parseContract(text: string): Contract {
	let raw: unknown;
	try {
		raw = parse(text);
	} catch (e) {
		throw new ContractSyntaxError(e instanceof YAMLParseError ? e.message : String(e));
	}

	const c = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
	const text_ = (key: 'workerName' | 'clientName') =>
		typeof c[key] === 'string' ? c[key] : CONTRACT_DEFAULTS[key];
	const num = (key: 'lowerHours' | 'upperHours' | 'dailyHours') =>
		typeof c[key] === 'number' && Number.isFinite(c[key]) ? c[key] : CONTRACT_DEFAULTS[key];

	return {
		workerName: text_('workerName'),
		clientName: text_('clientName'),
		lowerHours: num('lowerHours'),
		upperHours: num('upperHours'),
		dailyHours: num('dailyHours'),
		maxEndTime: readMaxEndTime(c.maxEndTime)
	};
}

/**
 * maxEndTime の復元。
 *
 * 範囲の検証は validateContract に任せ、ここは書式だけを整える。解釈できない値は
 * 空文字のまま持ち上げて、検証側にエラーを出させる。既定値へ黙って倒すと、利用者
 * は自分の書いた値が無視されたことに気付けない。
 */
function readMaxEndTime(value: unknown): string {
	if (value === undefined || value === null) return CONTRACT_DEFAULTS.maxEndTime;
	if (typeof value === 'number' && Number.isInteger(value)) {
		const h = Math.floor(value / 60);
		const m = value % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}
	if (typeof value !== 'string') return '';
	if (isTimeString(value)) return value;
	const parsed = parseTimeInput(value);
	return parsed.ok && parsed.value !== null ? parsed.value : '';
}
