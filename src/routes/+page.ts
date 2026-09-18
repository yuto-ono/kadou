import { redirect } from '@sveltejs/kit';
import { fetchMonths } from '$lib/client/api';
import { monthStringOf } from '$lib/domain/calendar';
import type { PageLoad } from './$types';

/**
 * 直近の月へ飛ばす（SPEC.md §6）。
 *
 * 現在月のファイルがあればその月、なければ既存の月のうち最大のもの、1 件も
 * なければ現在月。最後の場合は未作成の月が開き、作成の導線が出る。
 */
export const load: PageLoad = async ({ fetch }) => {
	const months = await fetchMonths(fetch);
	const current = monthStringOf(new Date());
	redirect(307, `/${months.includes(current) ? current : (months[0] ?? current)}`);
};
