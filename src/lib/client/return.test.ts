import { describe, expect, it, vi } from 'vitest';
import { onReturn } from './return';

function setup(callback: () => Promise<void>) {
	const win = new EventTarget();
	const doc = Object.assign(new EventTarget(), {
		visibilityState: 'visible' as DocumentVisibilityState
	});
	const off = onReturn(callback, win, doc);
	return { win, doc, off };
}

describe('onReturn', () => {
	it('フォーカスを得たときに呼ぶ', () => {
		const callback = vi.fn().mockResolvedValue(undefined);
		const { win } = setup(callback);
		win.dispatchEvent(new Event('focus'));
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('タブが表示されたときに呼び、隠れたときは呼ばない', () => {
		const callback = vi.fn().mockResolvedValue(undefined);
		const { doc } = setup(callback);

		doc.visibilityState = 'hidden';
		doc.dispatchEvent(new Event('visibilitychange'));
		expect(callback).not.toHaveBeenCalled();

		doc.visibilityState = 'visible';
		doc.dispatchEvent(new Event('visibilitychange'));
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('走っている間の呼び出しは捨て、終われば再び呼ぶ', async () => {
		let finish = () => {};
		const callback = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
		const { win, doc } = setup(callback);

		win.dispatchEvent(new Event('focus'));
		doc.dispatchEvent(new Event('visibilitychange'));
		expect(callback).toHaveBeenCalledTimes(1);

		finish();
		await vi.waitFor(() => {
			win.dispatchEvent(new Event('focus'));
			expect(callback).toHaveBeenCalledTimes(2);
		});
	});

	it('失敗しても次の呼び出しを止めない', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const callback = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined);
		const { win } = setup(callback);

		win.dispatchEvent(new Event('focus'));
		await vi.waitFor(() => {
			win.dispatchEvent(new Event('focus'));
			expect(callback).toHaveBeenCalledTimes(2);
		});
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});

	it('解除したら呼ばない', () => {
		const callback = vi.fn().mockResolvedValue(undefined);
		const { win, off } = setup(callback);
		off();
		win.dispatchEvent(new Event('focus'));
		expect(callback).not.toHaveBeenCalled();
	});
});
