import { isTimeString, toMinutes } from '../time';
import type { Contract } from '../types';
import { issue, type Issue } from './issue';

/**
 * 契約設定の検証（SPEC.md §8）。読み込み時に 1 度だけ走る。
 *
 * 違反があっても既存の月は開ける。止めるのは月の新規作成だけで、不正な値が
 * スナップショットとして月へ焼き付くのを防ぐのが目的（SPEC.md §8）。
 */
export function validateContract(contract: Contract): Issue[] {
	const issues: Issue[] = [];

	for (const field of ['workerName', 'clientName'] as const) {
		if (contract[field].trim() === '') {
			issues.push(issue('contractNameEmpty', { field }));
		}
	}

	if (contract.lowerHours > contract.upperHours) {
		issues.push(issue('contractRangeInverted', { field: 'lowerHours' }));
	}

	if (!(contract.dailyHours > 0)) {
		issues.push(issue('contractDailyHoursNotPositive', { field: 'dailyHours' }));
	}

	// 24:00〜47:59（SPEC.md §4.1）
	if (
		!isTimeString(contract.maxEndTime) ||
		toMinutes(contract.maxEndTime) < 24 * 60 ||
		toMinutes(contract.maxEndTime) > 47 * 60 + 59
	) {
		issues.push(issue('contractMaxEndTimeOutOfRange', { field: 'maxEndTime' }));
	}

	return issues;
}

/** 月の新規作成を止めるかどうか（SPEC.md §8） */
export function blocksMonthCreation(issues: Issue[]): boolean {
	return issues.some((i) => i.code.startsWith('contract'));
}
