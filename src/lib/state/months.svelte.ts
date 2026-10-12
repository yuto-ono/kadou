import { fetchMonths } from '$lib/client/api';
import { monthStringOf } from '$lib/domain/calendar';

/** 月の一覧（SPEC.md §4.4）。直近の月から降順 */
export class MonthsStore {
	months = $state<string[]>([]);

	async load(): Promise<void> {
		const months = await fetchMonths();
		// 画面に戻るたびに呼ばれる。変わっていなければ月セレクタを作り直さない
		if (months.join() !== this.months.join()) this.months = months;
	}

	/**
	 * 「直近の月」（SPEC.md §6）。
	 *
	 * 現在月のファイルがあればその月、なければ既存の月のうち最大のもの、1 件も
	 * なければ現在月。最後の場合は未作成の月を開くことになり、作成の導線が出る。
	 */
	latest(now: Date): string {
		const current = monthStringOf(now);
		if (this.months.includes(current)) return current;
		return this.months[0] ?? current;
	}
}
