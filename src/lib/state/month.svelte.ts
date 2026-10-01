import { fetchMonth, NotFoundError, saveMonth } from '$lib/client/api';
import { today } from '$lib/client/clock';
import { createDebouncedWriter, type DebouncedWriter } from '$lib/client/debounce';
import { emptyMonth, toSnapshot } from '$lib/domain/calendar';
import { applyDayTypeChange, suggestContent, needsClearConfirm } from '$lib/domain/dayEdit';
import { sortPeriods } from '$lib/domain/periods';
import { summarize, type MonthSummary } from '$lib/domain/summary';
import type { Contract, DayRecord, DayType, MonthData, WorkPeriod } from '$lib/domain/types';
import { validateDay } from '$lib/domain/validate/day';
import type { Issue } from '$lib/domain/validate/issue';

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
	unsaved = $state(false);
	/** 選択中の行。詳細パネルが開いているかを兼ねる */
	selectedDate = $state<string | null>(null);

	#writer: DebouncedWriter<MonthData>;
	#maxEndTime: () => string;

	constructor(month: string, maxEndTime: () => string) {
		this.month = month;
		this.#maxEndTime = maxEndTime;
		this.#writer = createDebouncedWriter((data) => saveMonth(this.month, data), {
			onError: (e) => {
				this.saveError = e instanceof Error ? e.message : String(e);
			},
			onPendingChange: (pending) => {
				this.unsaved = pending;
			}
		});
	}

	summary = $derived<MonthSummary | null>(
		this.data === null ? null : summarize(this.data, today())
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

	async load(): Promise<void> {
		this.state = 'loading';
		try {
			const { data, issues } = await fetchMonth(this.month);
			this.data = data;
			this.fileIssues = issues;
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

	/** 未作成の月を作る。契約設定のスナップショットをここで焼き付ける（SPEC.md §4.4） */
	async create(contract: Contract): Promise<void> {
		const data = emptyMonth(this.month, toSnapshot(contract));
		await saveMonth(this.month, data);
		this.data = data;
		this.fileIssues = [];
		this.state = 'ready';
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
	}

	setPeriods(date: string, workPeriods: WorkPeriod[]): void {
		this.#replaceDay(date, (day) => ({ ...day, workPeriods }));
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
		if (this.data === null) return;
		this.saveError = null;
		this.#writer.schedule(this.data);
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
