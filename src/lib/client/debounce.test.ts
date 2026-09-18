import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebouncedWriter } from './debounce';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createDebouncedWriter', () => {
	it('入力が止まるまで書き込まない', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const w = createDebouncedWriter(write, { waitMs: 800, maxWaitMs: 5000 });

		w.schedule('a');
		await vi.advanceTimersByTimeAsync(700);
		expect(write).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(200);
		expect(write).toHaveBeenCalledExactlyOnceWith('a');
	});

	it('変更が続けば待ち直す', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const w = createDebouncedWriter(write, { waitMs: 800, maxWaitMs: 5000 });

		for (let i = 0; i < 5; i++) {
			w.schedule(`v${i}`);
			await vi.advanceTimersByTimeAsync(500);
		}
		expect(write).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(800);
		expect(write).toHaveBeenCalledExactlyOnceWith('v4');
	});

	it('変更が続いても maxWaitMs で必ず書き込む', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const w = createDebouncedWriter(write, { waitMs: 800, maxWaitMs: 2000 });

		for (let i = 0; i < 10; i++) {
			w.schedule(`v${i}`);
			await vi.advanceTimersByTimeAsync(400);
		}
		expect(write).toHaveBeenCalled();
		expect(write.mock.calls[0][0]).toBe('v4');
	});

	it('最後の値だけを書き込む', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const w = createDebouncedWriter(write, { waitMs: 800 });

		w.schedule('a');
		w.schedule('b');
		w.schedule('c');
		await vi.advanceTimersByTimeAsync(800);
		expect(write).toHaveBeenCalledExactlyOnceWith('c');
	});

	describe('flush', () => {
		it('予約を直ちに実行して待つ', async () => {
			const write = vi.fn().mockResolvedValue(undefined);
			const w = createDebouncedWriter(write, { waitMs: 800 });

			w.schedule('a');
			await w.flush();
			expect(write).toHaveBeenCalledExactlyOnceWith('a');
			expect(w.hasPending).toBe(false);
		});

		it('予約がなければ何もしない', async () => {
			const write = vi.fn().mockResolvedValue(undefined);
			const w = createDebouncedWriter(write, { waitMs: 800 });
			await w.flush();
			expect(write).not.toHaveBeenCalled();
		});

		it('flush 後にタイマーが再発火しない', async () => {
			const write = vi.fn().mockResolvedValue(undefined);
			const w = createDebouncedWriter(write, { waitMs: 800 });

			w.schedule('a');
			await w.flush();
			await vi.advanceTimersByTimeAsync(5000);
			expect(write).toHaveBeenCalledTimes(1);
		});
	});

	it('cancel すると書き込まない', async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		const w = createDebouncedWriter(write, { waitMs: 800 });

		w.schedule('a');
		w.cancel();
		await vi.advanceTimersByTimeAsync(5000);
		expect(write).not.toHaveBeenCalled();
	});

	it('書き込みの順序が入れ替わらない', async () => {
		const order: string[] = [];
		let releaseFirst: () => void = () => {};
		const write = vi
			.fn()
			.mockImplementationOnce(
				(v: string) => new Promise<void>((r) => (releaseFirst = () => { order.push(v); r(); }))
			)
			.mockImplementationOnce(async (v: string) => { order.push(v); });

		const w = createDebouncedWriter(write, { waitMs: 100 });
		w.schedule('先');
		await vi.advanceTimersByTimeAsync(100);
		w.schedule('後');
		await vi.advanceTimersByTimeAsync(100);

		releaseFirst();
		await w.flush();
		expect(order).toEqual(['先', '後']);
	});

	it('書き込みの失敗を通知し、後続を止めない', async () => {
		const onError = vi.fn();
		const write = vi
			.fn()
			.mockRejectedValueOnce(new Error('書けない'))
			.mockResolvedValue(undefined);
		const w = createDebouncedWriter(write, { waitMs: 100, onError });

		w.schedule('a');
		await vi.advanceTimersByTimeAsync(100);
		await w.flush();
		expect(onError).toHaveBeenCalledOnce();

		w.schedule('b');
		await w.flush();
		expect(write).toHaveBeenCalledTimes(2);
	});

	it('未保存かどうかを通知する', async () => {
		const pending: boolean[] = [];
		const w = createDebouncedWriter(async () => {}, {
			waitMs: 100,
			onPendingChange: (p) => pending.push(p)
		});

		w.schedule('a');
		expect(w.hasPending).toBe(true);
		await vi.advanceTimersByTimeAsync(100);
		expect(w.hasPending).toBe(false);
		expect(pending).toEqual([true, false]);
	});
});
