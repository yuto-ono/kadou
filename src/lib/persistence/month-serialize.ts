import { Document } from 'yaml';
import { DAY_DEFAULTS } from '$lib/domain/defaults';
import type { DayRecord, MonthData } from '$lib/domain/types';
import { blockLiteral, quoted } from './scalars';

/**
 * 月次データを YAML テキストへ書き出す（SPEC.md §4.5）。
 *
 * 既定値と同じフィールドは書き出さない。土日や祝日の行が数行に収まり、diff が
 * 読みやすくなる。date と dayType は既定値を持たず常に書く。
 */
export function serializeMonth(data: MonthData): string {
	const root: Record<string, unknown> = {
		month: quoted(data.month),
		contract: {
			workerName: data.contract.workerName,
			clientName: data.contract.clientName,
			lowerHours: data.contract.lowerHours,
			upperHours: data.contract.upperHours,
			dailyHours: data.contract.dailyHours
		}
	};

	if (data.remarks !== DAY_DEFAULTS.journal) root.remarks = blockLiteral(data.remarks);
	root.days = data.days.map(serializeDay);

	const doc = new Document(root);
	return doc.toString({ lineWidth: 0 });
}

function serializeDay(day: DayRecord): Record<string, unknown> {
	const out: Record<string, unknown> = {
		date: quoted(day.date),
		dayType: day.dayType
	};

	if (day.startTime !== DAY_DEFAULTS.startTime) out.startTime = quoted(day.startTime as string);
	if (day.endTime !== DAY_DEFAULTS.endTime) out.endTime = quoted(day.endTime as string);
	if (day.breaks.length > 0) {
		out.breaks = day.breaks.map((b) => ({ start: quoted(b.start), end: quoted(b.end) }));
	}
	if (day.workContent !== DAY_DEFAULTS.workContent) out.workContent = day.workContent;
	if (day.journal !== DAY_DEFAULTS.journal) out.journal = blockLiteral(day.journal);
	if (day.contentAutoFilled !== DAY_DEFAULTS.contentAutoFilled) {
		out.contentAutoFilled = day.contentAutoFilled;
	}

	return out;
}
