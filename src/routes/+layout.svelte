<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import '#lib/styles/app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>稼働時間記録</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
