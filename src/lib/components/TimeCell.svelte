<script lang="ts">
	import { parseTimeInput, type TimeParseFailure } from '$lib/domain/time';

	/**
	 * 時刻の入力欄（SPEC.md §8「時刻入力の形式」）。
	 *
	 * <input type="time"> は 24 時以降を受け付けないためテキスト入力にする。
	 * 正規化は確定時（blur / Enter）に行う。打鍵のたびに書き換えるとカーソルが飛ぶ。
	 * Esc で編集前の値へ戻し、もう一度押すと欄から抜ける。
	 */
	interface Props {
		value: string | null;
		invalid?: boolean;
		label: string;
		/** 一覧では枠線をホバーまで隠す。詳細パネルでは常に見せる */
		quiet?: boolean;
		onCommit: (value: string | null) => void;
	}

	let { value, invalid = false, label, quiet = true, onCommit }: Props = $props();

	/** 編集中の下書き。null は「編集していない」で、表示は value に従う */
	let draft = $state<string | null>(null);
	let formatError = $state<TimeParseFailure | null>(null);

	const shown = $derived(draft ?? value ?? '');
	const hasError = $derived(invalid || formatError !== null);

	function commit() {
		if (draft === null) return;

		const parsed = parseTimeInput(draft);
		if (!parsed.ok) {
			formatError = parsed.reason;
			return;
		}
		formatError = null;
		draft = null;
		if (parsed.value !== value) onCommit(parsed.value);
	}

	/** 確定の規則は全入力欄で共通（SPEC.md §6.1「入力欄の確定」） */
	function keydown(e: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		if (e.isComposing || e.keyCode === 229) return;
		if (e.key === 'Enter') {
			e.currentTarget.blur();
		} else if (e.key === 'Escape') {
			// 一段ずつ抜ける。編集中なら値を戻して欄に留まり、そうでなければ欄から
			// 抜けてパネルを閉じる Esc として通す
			if (draft === null) {
				e.currentTarget.blur();
			} else {
				draft = null;
				formatError = null;
				e.stopPropagation();
			}
		}
	}

	const MESSAGE: Record<TimeParseFailure, string> = {
		format: '時刻として読めません',
		hour: '時は 47 までです',
		minute: '分は 59 までです'
	};
</script>

<input
	class="time"
	class:quiet-field={quiet}
	class:field-error={hasError}
	aria-label={label}
	aria-invalid={hasError}
	title={formatError ? MESSAGE[formatError] : undefined}
	value={shown}
	oninput={(e) => (draft = e.currentTarget.value)}
	onblur={commit}
	onkeydown={keydown}
/>

<style>
	.time {
		width: 4.9rem;
		padding: 0.15rem 0.25rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.time::placeholder {
		color: var(--fg-subtle);
	}
</style>
