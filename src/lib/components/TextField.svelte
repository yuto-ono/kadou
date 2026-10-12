<script lang="ts">
	import { tick } from 'svelte';
	import { contentLength } from '$lib/domain/validate/day';

	/**
	 * 文字の入力欄（SPEC.md §6.1「入力欄の確定」）。
	 *
	 * 打っている間はこの欄の中だけに持ち、Enter かフォーカス離脱で保存する。Esc で
	 * 編集前の値へ戻し、もう一度押すと欄から抜ける。時刻の欄（TimeCell）と同じ確定の規則にそろえる。
	 *
	 * multiline は改行を入力するので Enter では確定せず、フォーカス離脱でのみ保存する。
	 */
	interface Props {
		value: string;
		label: string;
		id?: string;
		multiline?: boolean;
		/** 単一行のみ。超える入力は受け付けない（SPEC.md §4.2） */
		maxLength?: number;
		placeholder?: string;
		/** 一覧では枠線をホバーまで隠す */
		quiet?: boolean;
		invalid?: boolean;
		/** 空欄へフォーカスしたときに入れて全選択する値（SPEC.md §6.1「入力補助」） */
		suggestion?: string | null;
		/** 表示中の文字数。残り文字数の表示に使う */
		length?: number;
		onCommit: (value: string) => void;
		/** Enter で確定した直後に呼ぶ。次の日の欄へ移るのに使う。Cmd+Enter では呼ばない */
		onEnter?: () => void;
	}

	let {
		value,
		label,
		id,
		multiline = false,
		maxLength,
		placeholder,
		quiet = false,
		invalid = false,
		suggestion = null,
		// $bindable の初期値は親が bind しないときの値。$effect が書き戻すのを ESLint が追えない
		// eslint-disable-next-line no-useless-assignment
		length = $bindable(0),
		onCommit,
		onEnter
	}: Props = $props();

	/** 編集中の下書き。null は「編集していない」で、表示は value に従う */
	let draft = $state<string | null>(null);
	const shown = $derived(draft ?? value);

	$effect(() => {
		length = contentLength(shown);
	});

	/** 改行を受け付けず、上限を超えた分を落とす。行高が変わると 1 ページ制約が崩れる */
	function sanitize(text: string): string {
		if (multiline) return text;
		const line = text.replace(/[\r\n]+/g, ' ');
		return maxLength === undefined ? line : [...line].slice(0, maxLength).join('');
	}

	function commit() {
		if (draft === null) return;
		const next = sanitize(draft);
		draft = null;
		if (next !== value) onCommit(next);
	}

	async function suggest(el: HTMLInputElement | HTMLTextAreaElement) {
		if (value !== '' || !suggestion) return;
		draft = suggestion;
		// 値が DOM に反映されてから選択する。文字を打てばそのまま置き換わる
		await tick();
		if (document.activeElement === el) el.select();
	}

	function keydown(e: KeyboardEvent & { currentTarget: HTMLInputElement | HTMLTextAreaElement }) {
		// 日本語入力の変換確定の Enter は確定として扱わない。Safari は isComposing を
		// 立てずに keyCode 229 を送ることがある
		if (e.isComposing || e.keyCode === 229) return;

		// Esc は一段ずつ抜ける。編集中なら値を戻して欄に留まり、そうでなければ欄から
		// 抜けてパネルを閉じる Esc として通す
		if (e.key === 'Escape') {
			if (draft === null) {
				e.currentTarget.blur();
			} else {
				draft = null;
				e.stopPropagation();
			}
			return;
		}
		if (e.key === 'Enter' && !multiline) {
			e.preventDefault();
			commit();
			// Cmd+Enter（Ctrl+Enter）は次の日へ移らず、その場で入力を終える
			if (onEnter && !e.metaKey && !e.ctrlKey) onEnter();
			else e.currentTarget.blur();
		}
	}
</script>

{#if multiline}
	<textarea
		{id}
		class:quiet-field={quiet}
		class:field-error={invalid}
		aria-label={label}
		aria-invalid={invalid}
		{placeholder}
		value={shown}
		oninput={(e) => (draft = e.currentTarget.value)}
		onfocus={(e) => suggest(e.currentTarget)}
		onblur={commit}
		onkeydown={keydown}
	></textarea>
{:else}
	<input
		{id}
		class:quiet-field={quiet}
		class:field-error={invalid}
		aria-label={label}
		aria-invalid={invalid}
		maxlength={maxLength}
		{placeholder}
		value={shown}
		oninput={(e) => (draft = e.currentTarget.value)}
		onfocus={(e) => suggest(e.currentTarget)}
		onblur={commit}
		onkeydown={keydown}
	/>
{/if}
