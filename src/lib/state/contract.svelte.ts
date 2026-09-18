import { fetchContract, NotFoundError } from '$lib/client/api';
import type { Contract } from '$lib/domain/types';
import { blocksMonthCreation, validateContract } from '$lib/domain/validate/contract';
import type { Issue } from '$lib/domain/validate/issue';

/**
 * 契約設定（SPEC.md §4.1）。
 *
 * 画面のロード時に 1 度だけ読む。編集したら画面を再読み込みすれば反映される。
 * アプリからは書き換えない。
 */
export class ContractStore {
	contract = $state<Contract | null>(null);
	/** ファイルが存在しない。雛形を表示して利用者に作ってもらう（SPEC.md §4.5） */
	missing = $state(false);
	/** 読み込めなかった理由（構文エラーなど） */
	loadError = $state<string | null>(null);

	issues = $derived<Issue[]>(this.contract === null ? [] : validateContract(this.contract));

	/**
	 * 違反があっても既存の月は開ける。止めるのは月の新規作成だけで、不正な値が
	 * スナップショットとして月へ焼き付くのを防ぐのが目的（SPEC.md §8）。
	 */
	canCreateMonth = $derived(
		this.contract !== null && !this.missing && !blocksMonthCreation(this.issues)
	);

	async load(): Promise<void> {
		this.missing = false;
		this.loadError = null;
		try {
			this.contract = await fetchContract();
		} catch (e) {
			this.contract = null;
			if (e instanceof NotFoundError) this.missing = true;
			else this.loadError = e instanceof Error ? e.message : String(e);
		}
	}
}
