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
		max-width: 25rem;
		padding: 1.1rem 1.3rem;
		border: none;
		border-radius: 10px;
		background: var(--surface);
		box-shadow: 0 10px 40px rgb(0 0 0 / 0.18);
		color: inherit;
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.3);
	}

	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.02rem;
		font-weight: 650;
	}

	p {
		color: var(--fg-muted);
	}

	p {
		margin: 0 0 1rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}


</style>
