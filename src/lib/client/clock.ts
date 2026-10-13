import { dateStringOf } from '$lib/domain/calendar';

/**
 * 現在時刻を読む唯一の場所。
 *
 * ドメイン側は「本日」が要るなら引数で受け取る。実行日に依存するテストを
 * 作らないための決まりで、時計を読む場所をここ 1 つに絞ることで守る。
 */
export function today(): string {
	return dateStringOf(new Date());
}
