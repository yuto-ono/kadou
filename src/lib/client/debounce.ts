/**
 * 入力が止まってからまとめて書き込むためのスケジューラ（SPEC.md §4.5「書き込み」）。
 *
 * サーバー側に置かない。タイマーを持たせると「入力が止まったか」をサーバーが知る
 * 必要が生じ、状態を持つことになる。
 *
 * Svelte に依存させず、タイマーも差し替えられるようにしてある。フェイクタイマーで
 * 待ち時間そのものを検証できる。
 */

export interface DebouncedWriterOptions {
	/** 最後の変更からこれだけ空いたら書き込む */
	waitMs?: number;
	/** 変更が続いていても、最初の変更からこれを超えたら書き込む */
	maxWaitMs?: number;
	/** 書き込みに失敗したときの通知。握り潰すと保存されていないことに気付けない */
	onError?: (error: unknown) => void;
	/** 書き込み中かどうかの通知 */
	onPendingChange?: (pending: boolean) => void;
}

export interface DebouncedWriter<T> {
	/** 変更を通知する。値は書き込み直前に評価される */
	schedule(value: T): void;
	/** 予約されている書き込みを直ちに実行して待つ。月の切り替えや削除の前に呼ぶ */
	flush(): Promise<void>;
	/** 予約を捨てる */
	cancel(): void;
	readonly hasPending: boolean;
}

export function createDebouncedWriter<T>(
	write: (value: T) => Promise<void>,
	options: DebouncedWriterOptions = {}
): DebouncedWriter<T> {
	const waitMs = options.waitMs ?? 800;
	const maxWaitMs = options.maxWaitMs ?? 5000;

	let timer: ReturnType<typeof setTimeout> | null = null;
	let deadline: number | null = null;
	let queued: { value: T } | null = null;
	/** 直前の書き込みが終わるまで次を始めない。順序が入れ替わると古い内容で上書きされる */
	let inFlight: Promise<void> = Promise.resolve();

	function clearTimer() {
		if (timer !== null) clearTimeout(timer);
		timer = null;
	}

	function notify() {
		options.onPendingChange?.(queued !== null);
	}

	function arm() {
		clearTimer();
		const now = Date.now();
		if (deadline === null) deadline = now + maxWaitMs;
		timer = setTimeout(run, Math.max(0, Math.min(waitMs, deadline - now)));
	}

	function run() {
		clearTimer();
		deadline = null;
		const pending = queued;
		queued = null;
		notify();
		if (pending === null) return;

		inFlight = inFlight
			.then(() => write(pending.value))
			.catch((e) => {
				options.onError?.(e);
			});
	}

	return {
		schedule(value: T) {
			queued = { value };
			notify();
			arm();
		},
		async flush() {
			if (queued !== null) run();
			await inFlight;
		},
		cancel() {
			clearTimer();
			deadline = null;
			queued = null;
			notify();
		},
		get hasPending() {
			return queued !== null;
		}
	};
}
