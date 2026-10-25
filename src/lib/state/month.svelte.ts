import {
	ConflictError,
	fetchMonth,
	fetchMonthIfChanged,
	NotFoundError,
	removeMonth,
	saveMonth,
	type MonthVersion
} from '#lib/client/api.ts';
import { today } from '#lib/client/clock.ts';
import { createDebouncedWriter, type DebouncedWriter } from '#lib/client/debounce.ts';
import { emptyMonth, toSnapshot } from '#lib/domain/calendar.ts';
import { applyDayTypeChange, suggestContent, needsClearConfirm } from '#lib/domain/dayEdit.ts';
import { sortPeriods } from '#lib/domain/periods.ts';
import { summarize, type MonthSummary } from '#lib/domain/summary.ts';
import type { Contract, DayRecord, DayType, MonthData, WorkPeriod } from '#lib/domain/types.ts';
import { validateDay } from '#lib/domain/validate/day.ts';
import type { Issue } from '#lib/domain/validate/issue.ts';
import { pendingPeriods, type PendingPeriod } from './pendingPeriods.svelte';

export type LoadState = 'loading' | 'ready' | 'missing' | 'error';

/**
 * 表示中の月（SPEC.md §6.1）。
 *
 * 変更はすべてこのストアを通す。書き込みのデバウンスと、区分変更時の副作用を
 * 1 箇所に集めるため。計算と検証は domain/ の純粋関数に委ね、ここは配線に徹する。
 */
export class MonthStore {
	readonly month: string;
	data = $state<MonthData | null>(null);
	state = $state<LoadState>('loading');
	/** ファイル側の不整合（SPEC.md §4.5）。読み込み時にのみ更新する */
	fileIssues = $state<Issue[]>([]);
	loadError = $state<string | null>(null);
	saveError = $state<string | null>(null);
	/**
	 * 読み込んだあとにファイルが画面の外で書き換えられた（SPEC.md §4.5「外部での変更との
	 * 衝突」）。立っている間は保存しない。再読み込みで下ろす
	 */
	conflict = $state<string | null>(null);
	unsaved = $state(false);
	/** 選択中の行。詳細パネルが開いているかを兼ねる */
	selectedDate = $state<string | null>(null);
	/**
	 * 本日。画面に戻ったときに取り直す。開いたまま日をまたいでも、今日の行が
	 * 古い日付のまま残らない
	 */
	today = $state(today());

	#writer: DebouncedWriter<MonthData>;
	#maxEndTime: () => string;
	/** 最後に読み込んだか書き込んだときの版。次の書き込みで送り返す */
	#version: MonthVersion = null;

	constructor(month: string, maxEndTime: () => string) {
		this.month = month;
		this.#maxEndTime = maxEndTime;
		this.#writer = createDebouncedWriter(
			async (data) => {
				this.#version = await saveMonth(this.month, data, this.#version);
			},
			{
				onError: (e) => {
					if (e instanceof ConflictError) this.#enterConflict(e);
					else this.saveError = e instanceof Error ? e.message : String(e);
				},
				onPendingChange: (pending) => {
					this.unsaved = pending;
				}
			}
		);
	}

	summary = $derived<MonthSummary | null>(
		this.data === null ? null : summarize(this.data)
	);

	/** 入力の検証（SPEC.md §8）。日付を引いて使う。打鍵ごとに再評価される */
	dayIssues = $derived<Record<string, Issue[]>>(
		Object.fromEntries(
			(this.data?.days ?? []).map((day) => [day.date, validateDay(day, this.#maxEndTime())])
		)
	);

	selectedDay = $derived<DayRecord | null>(
		this.data?.days.find((d) => d.date === this.selectedDate) ?? null
	);

	/** 衝突のあとに呼ぶと、画面にしかない未保存の入力を捨ててファイルの内容に戻る */
	async load(): Promise<void> {
		this.#writer.cancel();
		this.state = 'loading';
		this.conflict = null;
		this.saveError = null;
		try {
			const { data, issues, version } = await fetchMonth(this.month);
			this.data = data;
			this.fileIssues = issues;
			this.#version = version;
			this.state = 'ready';
		} catch (e) {
			this.data = null;
			if (e instanceof NotFoundError) {
				this.state = 'missing';
			} else {
				this.state = 'error';
				this.loadError = e instanceof Error ? e.message : String(e);
			}
		}
	}

	/**
	 * 画面に戻ったときの読み直し（SPEC.md §4.5「画面に戻ったときの読み直し」）。
	 *
	 * 画面にしかない入力は捨てない。未保存の変更は先に書き出し、そこで衝突したら
	 * 読み直さずに案内を出す。読み直しに失敗しても今の表示を残す。
	 */
	async refresh(): Promise<void> {
		// ファイルを読み直さない場合（衝突中など）も日付は進める
		this.today = today();
		if (this.state === 'loading') return;
		await this.flush();
		if (this.conflict !== null || this.#writer.hasPending) return;

		const known = this.state === 'ready' ? this.#version : null;
		let fresh: Awaited<ReturnType<typeof fetchMonthIfChanged>>;
		try {
			fresh = await fetchMonthIfChanged(this.month, known);
		} catch (e) {
			if (e instanceof NotFoundError && this.state === 'ready') {
				// 外で消された。未作成の月として出す（SPEC.md §6「月の作成と削除の導線」）
				this.data = null;
				this.selectedDate = null;
				this.state = 'missing';
			}
			return;
		}
		// 読み直している間に打鍵があれば、そちらを優先する。次に戻ったときに読み直す
		if (fresh === null || this.#writer.hasPending) return;

		this.data = fresh.data;
		this.fileIssues = fresh.issues;
		this.#version = fresh.version;
		this.loadError = null;
		this.state = 'ready';
	}

	/** 未作成の月を作る。契約設定のスナップショットをここで焼き付ける（SPEC.md §4.4） */
	async create(contract: Contract): Promise<void> {
		const data = emptyMonth(this.month, toSnapshot(contract));
		try {
			this.#version = await saveMonth(this.month, data, null);
		} catch (e) {
			// 画面の外で先に作られていた。そちらを読む
			if (e instanceof ConflictError) return this.load();
			throw e;
		}
		this.data = data;
		this.fileIssues = [];
		this.state = 'ready';
	}

	/** 月を消す。画面の外で書き換えられていたら消さずに false を返す */
	async remove(): Promise<boolean> {
		await this.flush();
		if (this.conflict !== null || this.#version === null) return false;
		try {
			await removeMonth(this.month, this.#version);
			pendingPeriods.discardMonth(this.month);
			return true;
		} catch (e) {
			if (e instanceof ConflictError) {
				this.#enterConflict(e);
				return false;
			}
			throw e;
		}
	}

	// --- 編集 ---

	updateDay(date: string, patch: Partial<DayRecord>): void {
		this.#replaceDay(date, (day) => ({ ...day, ...patch }));
	}

	/** 区分変更に確認が要るか（SPEC.md §6.1）。UI はこの結果でモーダルを出す */
	needsClearConfirm(date: string, next: DayType): boolean {
		const day = this.#find(date);
		return day !== null && needsClearConfirm(day, next);
	}

	changeDayType(date: string, next: DayType): void {
		this.#replaceDay(date, (day) => applyDayTypeChange(day, next));
		// 稼働区間のクリアに合わせて捨てる。確認の要否には含めない（SPEC.md §6.1）
		pendingPeriods.set(date, null);
	}

	setPeriods(date: string, workPeriods: WorkPeriod[]): void {
		this.#replaceDay(date, (day) => ({ ...day, workPeriods }));
	}

	/** 入力途中の区間（SPEC.md §6.1「稼働区間の入力」）。データには入れない */
	pendingPeriod(date: string): PendingPeriod | null {
		return pendingPeriods.get(date);
	}

	setPendingPeriod(date: string, period: PendingPeriod | null): void {
		pendingPeriods.set(date, period);
	}

	/**
	 * 稼働区間を start の昇順へ並べる。
	 *
	 * 詳細パネルを閉じたときに呼ぶ。入力の途中で並べ替えると、時刻を打っている最中に
	 * 行が動いてフォーカスが外れる（SPEC.md §4.3）。
	 */
	sortPeriods(date: string): void {
		this.#replaceDay(date, (day) => ({ ...day, workPeriods: sortPeriods(day.workPeriods) }));
	}

	/** 空欄の作業内容へフォーカスしたときに入れる前回の内容（SPEC.md §6.1「入力補助」） */
	suggestContent(date: string): string | null {
		if (this.data === null) return null;
		return suggestContent(this.data.days, this.data.days.findIndex((d) => d.date === date));
	}

	setRemarks(remarks: string): void {
		if (this.data === null) return;
		this.data = { ...this.data, remarks };
		this.#scheduleSave();
	}

	// --- 保存 ---

	/** 月の切り替え・削除・離脱の前に呼ぶ */
	async flush(): Promise<void> {
		await this.#writer.flush();
	}

	#scheduleSave(): void {
		if (this.data === null || this.conflict !== null) return;
		this.saveError = null;
		this.#writer.schedule(this.data);
	}

	#enterConflict(e: ConflictError): void {
		this.#writer.cancel();
		this.conflict = e.message;
	}

	#find(date: string): DayRecord | null {
		return this.data?.days.find((d) => d.date === date) ?? null;
	}

	#replaceDay(date: string, update: (day: DayRecord) => DayRecord): void {
		if (this.data === null) return;
		const index = this.data.days.findIndex((d) => d.date === date);
		if (index < 0) return;

		const days = [...this.data.days];
		days[index] = update(days[index]);
		this.data = { ...this.data, days };
		this.#scheduleSave();
	}
}
