import { describe, expect, it } from 'vitest';
import {
	formatDuration,
	formatSignedDuration,
	fromMinutes,
	isTimeString,
	parseTimeInput,
	toMinutes,
	toReportTime
} from './time';

const parsed = (raw: string) => {
	const r = parseTimeInput(raw);
	return r.ok ? r.value : `NG:${r.reason}`;
};

describe('parseTimeInput', () => {
	it('1〜2 桁は時のみと解釈する', () => {
		expect(parsed('26')).toBe('26:00');
		expect(parsed('9')).toBe('09:00');
		expect(parsed('0')).toBe('00:00');
	});

	it('3 桁は H:MM と解釈する', () => {
		expect(parsed('930')).toBe('09:30');
		expect(parsed('000')).toBe('00:00');
	});

	it('4 桁は HH:MM と解釈する', () => {
		expect(parsed('2600')).toBe('26:00');
		expect(parsed('0930')).toBe('09:30');
	});

	it('コロンを含む場合はそのまま解釈しゼロ埋めする', () => {
		expect(parsed('26:00')).toBe('26:00');
		expect(parsed('9:5')).toBe('09:05');
		expect(parsed('9:')).toBe('09:00');
	});

	it('全角の数字とコロンを半角へ畳む', () => {
		expect(parsed('２６：００')).toBe('26:00');
		expect(parsed('０９３０')).toBe('09:30');
	});

	it('空入力は値のクリアとして扱う', () => {
		expect(parsed('')).toBeNull();
		expect(parsed('   ')).toBeNull();
	});

	it('分が 60 以上なら受け付けない', () => {
		expect(parsed('9:60')).toBe('NG:minute');
		expect(parsed('0999')).toBe('NG:minute');
	});

	it('時が 47 を超えるなら受け付けない', () => {
		expect(parsed('48')).toBe('NG:hour');
		expect(parsed('48:00')).toBe('NG:hour');
		// 47:59 は maxEndTime の上限として設定できる（SPEC.md §4.1）
		expect(parsed('47:59')).toBe('47:59');
	});

	it('数字とコロン以外は受け付けない', () => {
		expect(parsed('あ')).toBe('NG:format');
		expect(parsed('9時')).toBe('NG:format');
		expect(parsed('12345')).toBe('NG:format');
		expect(parsed(':30')).toBe('NG:format');
	});
});

describe('isTimeString', () => {
	it('ゼロ埋めされた HH:MM だけを通す', () => {
		expect(isTimeString('09:30')).toBe(true);
		expect(isTimeString('47:59')).toBe(true);
		expect(isTimeString('9:30')).toBe(false);
		expect(isTimeString('09:60')).toBe(false);
		expect(isTimeString('48:00')).toBe(false);
		// YAML 1.1 で 60 進数として読まれた場合に届く値（SPEC.md §4.5）
		expect(isTimeString(720)).toBe(false);
		expect(isTimeString(null)).toBe(false);
	});
});

describe('分との相互変換', () => {
	it('24 時超えを含めて往復する', () => {
		for (const t of ['00:00', '09:30', '23:59', '24:00', '26:00', '47:59']) {
			expect(fromMinutes(toMinutes(t))).toBe(t);
		}
	});

	it('24 時超えは 1440 以上になる', () => {
		expect(toMinutes('26:00')).toBe(1560);
		expect(toMinutes('24:00')).toBe(1440);
	});
});

describe('formatDuration', () => {
	it('時をゼロ埋めせず、3 桁も許す', () => {
		expect(formatDuration(60)).toBe('1:00');
		expect(formatDuration(9150)).toBe('152:30');
		expect(formatDuration(0)).toBe('0:00');
		expect(formatDuration(5)).toBe('0:05');
	});

	it('負の値は符号を前に出す', () => {
		expect(formatDuration(-150)).toBe('-2:30');
	});
});

describe('formatSignedDuration', () => {
	it('貯金には + を付け、借金には - を付ける', () => {
		expect(formatSignedDuration(210)).toBe('+3:30');
		expect(formatSignedDuration(-120)).toBe('-2:00');
		expect(formatSignedDuration(0)).toBe('0:00');
	});
});

describe('toReportTime', () => {
	it('24 時超えを翌日表記へ変換する', () => {
		expect(toReportTime('26:00')).toBe('翌2:00');
		expect(toReportTime('24:00')).toBe('翌0:00');
		expect(toReportTime('47:59')).toBe('翌23:59');
	});

	it('24 時未満はそのまま', () => {
		expect(toReportTime('09:30')).toBe('09:30');
		expect(toReportTime('23:59')).toBe('23:59');
	});
});
