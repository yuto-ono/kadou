<script lang="ts">
	import { messageOf } from '#lib/domain/messages.ts';
	import type { Issue } from '#lib/domain/validate/issue.ts';

	interface Props {
		title: string;
		issues: Issue[];
	}

	let { title, issues }: Props = $props();
</script>

{#if issues.length > 0}
	<div class="banner" role="alert">
		<strong>{title}</strong>
		<ul>
			{#each issues as issue, i (i)}
				<li>{issue.target.date ? `${issue.target.date}: ` : ''}{messageOf(issue)}</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.banner {
		padding: 0.5rem 1.25rem;
		border-bottom: 1px solid var(--line);
		background: var(--error-soft);
		color: var(--error);
		font-size: 0.8rem;
	}

	ul {
		margin: 0.15rem 0 0;
		padding-left: 1.1rem;
	}
</style>
