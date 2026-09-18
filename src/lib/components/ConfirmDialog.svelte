<script lang="ts">
	/** 確認モーダル。<dialog> を使い、フォーカス管理と Esc をブラウザに任せる */
	interface Props {
		title: string;
		message: string;
		confirmLabel?: string;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { title, message, confirmLabel = 'OK', onConfirm, onCancel }: Props = $props();

	let dialog = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		dialog?.showModal();
	});
</script>

<dialog bind:this={dialog} onclose={onCancel} oncancel={onCancel}>
	<h2>{title}</h2>
	<p>{message}</p>
	<div class="actions">
		<button onclick={onCancel}>キャンセル</button>
		<button class="primary" onclick={onConfirm}>{confirmLabel}</button>
	</div>
</dialog>

<style>
	dialog {
		max-width: 24rem;
		padding: 1rem 1.25rem;
		border: 1px solid var(--border-strong);
		border-radius: 6px;
		color: inherit;
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.3);
	}

	h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}

	p {
		margin: 0 0 1rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.primary {
		border-color: var(--accent);
		background: var(--accent);
		color: #fff;
	}

	.primary:hover {
		background: #075985;
	}
</style>
