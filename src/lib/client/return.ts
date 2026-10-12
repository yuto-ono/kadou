/**
 * 画面に戻ったときに呼ぶ（SPEC.md §4.5「画面に戻ったときの読み直し」）。
 *
 * ウィンドウのフォーカスとタブの表示の両方を見る。エディタやターミナルから戻る
 * 場合はタブの表示が変わらないため。タブを切り替えて戻ると両方が続けて来るので、
 * 走っている間の呼び出しは捨てる。
 *
 * 解除する関数を返す。$effect の戻り値にそのまま使える。
 */
export function onReturn(
	callback: () => Promise<void>,
	win: EventTarget = window,
	doc: EventTarget & { visibilityState: DocumentVisibilityState } = document
): () => void {
	let running = false;

	const fire = () => {
		if (running) return;
		running = true;
		callback()
			.catch((e: unknown) => console.error('画面に戻ったときの読み直しに失敗しました', e))
			.finally(() => (running = false));
	};
	const onVisibility = () => {
		if (doc.visibilityState === 'visible') fire();
	};

	win.addEventListener('focus', fire);
	doc.addEventListener('visibilitychange', onVisibility);
	return () => {
		win.removeEventListener('focus', fire);
		doc.removeEventListener('visibilitychange', onVisibility);
	};
}
