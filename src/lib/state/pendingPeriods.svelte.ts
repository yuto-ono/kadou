import type { TimeString } from '#lib/domain/types.ts';

/** 開始・終了の片方しか入力されていない区間（SPEC.md §6.1「稼働区間の入力」） */
export interface PendingPeriod {
	start: TimeString | null;
	end: TimeString | null;
}

/**
 * 入力途中の区間を日付ごとに持つ。
 *
 * MonthStore は月を移るたびに作り直されるので、その外に置く。月をまたいでも残し、
 * ページを再読み込みしたときだけ消える。ファイルには書かない。
 */
class PendingPeriods {
	#byDate = $state<Record<string, PendingPeriod>>({});

	get(date: string): PendingPeriod | null {
		return this.#byDate[date] ?? null;
	}

	set(date: string, period: PendingPeriod | null): void {
		if (period === null) delete this.#byDate[date];
		else this.#byDate[date] = period;
	}

	/** 月を消したときに呼ぶ。同じ月を作り直したときに古い入力が出てこないように */
	discardMonth(month: string): void {
		for (const date of Object.keys(this.#byDate)) {
			if (date.startsWith(`${month}-`)) delete this.#byDate[date];
		}
	}
}

export const pendingPeriods = new PendingPeriods();
