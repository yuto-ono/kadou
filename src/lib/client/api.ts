import type { Contract, MonthData } from '$lib/domain/types';
import type { Issue } from '$lib/domain/validate/issue';

/** API クライアント（SPEC.md §4.5）。ワイヤは JSON */

export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
	}
}

/** ファイルが存在しない。呼び出し側は「未作成」として扱う */
export class NotFoundError extends ApiError {}

/**
 * 読み込んだあとにファイルが画面の外で書き換えられた（SPEC.md §4.5「外部での変更との衝突」）。
 * サーバーは何も書いていない
 */
export class ConflictError extends ApiError {}

/**
 * SvelteKit の load から呼ぶときは、その load が受け取った fetch を渡す。
 * 素の window.fetch だと SvelteKit の追跡から外れる。
 */
export type Fetch = typeof globalThis.fetch;

async function request(path: string, init?: RequestInit, fetchFn: Fetch = fetch): Promise<Response> {
	const res = await fetchFn(path, init);
	if (res.ok) return res;
	throw await errorOf(res);
}

async function errorOf(res: Response): Promise<ApiError> {
	const message = await res
		.json()
		.then((b: { message?: string }) => b.message ?? res.statusText)
		.catch(() => res.statusText);

	if (res.status === 404) return new NotFoundError(404, message);
	if (res.status === 412) return new ConflictError(412, message);
	return new ApiError(res.status, message);
}

export async function fetchMonths(fetchFn?: Fetch): Promise<string[]> {
	const res = await request('/api/months', undefined, fetchFn);
	return ((await res.json()) as { months: string[] }).months;
}

/**
 * 月の版。書き込み・削除のときに送り返す。null は月がまだないことを表し、作成に使う
 * （SPEC.md §4.5「外部での変更との衝突」）
 */
export type MonthVersion = string | null;

export async function fetchMonth(
	month: string
): Promise<{ data: MonthData; issues: Issue[]; version: string }> {
	const res = await request(`/api/months/${month}`);
	const body = (await res.json()) as { data: MonthData; issues: Issue[] };
	return { ...body, version: versionFrom(res) };
}

/**
 * 手元の版から変わっていれば読み直す。変わっていなければ null（SPEC.md §4.5「画面に
 * 戻ったときの読み直し」）。月がなくなっていれば NotFoundError
 */
export async function fetchMonthIfChanged(
	month: string,
	version: MonthVersion
): Promise<{ data: MonthData; issues: Issue[]; version: string } | null> {
	// ブラウザの HTTP キャッシュを挟まない。挟むと 304 をキャッシュが引き取り、
	// 変わっていないことが呼び出し側に伝わらない
	const init: RequestInit = { cache: 'no-store' };
	if (version !== null) init.headers = { 'if-none-match': `"${version}"` };

	const res = await fetch(`/api/months/${month}`, init);
	if (res.status === 304) return null;
	if (!res.ok) throw await errorOf(res);

	const body = (await res.json()) as { data: MonthData; issues: Issue[] };
	return { ...body, version: versionFrom(res) };
}

/** 書いたあとの版を返す */
export async function saveMonth(
	month: string,
	data: MonthData,
	version: MonthVersion
): Promise<string> {
	const res = await request(`/api/months/${month}`, {
		method: 'PUT',
		headers: { 'content-type': 'application/json', ...precondition(version) },
		body: JSON.stringify(data)
	});
	return versionFrom(res);
}

export async function removeMonth(month: string, version: string): Promise<void> {
	await request(`/api/months/${month}`, { method: 'DELETE', headers: precondition(version) });
}

function precondition(version: MonthVersion): Record<string, string> {
	return version === null ? { 'if-none-match': '*' } : { 'if-match': `"${version}"` };
}

function versionFrom(res: Response): string {
	const etag = res.headers.get('etag');
	if (etag === null) throw new ApiError(res.status, 'サーバーが版を返しませんでした');
	return etag.replace(/^W\//, '').replace(/^"|"$/g, '');
}

export async function fetchContract(): Promise<Contract> {
	const res = await request('/api/contract');
	return ((await res.json()) as { data: Contract }).data;
}
