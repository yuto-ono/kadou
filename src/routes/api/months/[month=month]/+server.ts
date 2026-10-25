import { error } from '@sveltejs/kit';
import type { MonthData } from '#lib/domain/types.ts';
import { MonthSyntaxError } from '#lib/persistence/month-parse.ts';
import {
	currentVersion,
	deleteMonth,
	readMonth,
	RoundTripError,
	VersionMismatchError,
	writeMonth,
	type Precondition
} from '#lib/server/months.ts';
import type { RequestHandler } from './$types';

/** 壊れたボディで正しいファイルを置き換えないための、ごく粗い上限 */
const MAX_BODY_BYTES = 1_000_000;

export const GET: RequestHandler = async ({ params, request }) => {
	// 画面に戻るたびに来る読み直し（SPEC.md §4.5「画面に戻ったときの読み直し」）。
	// 変わっていなければパースせずに返す
	const known = request.headers.get('if-none-match');
	if (known !== null) {
		const version = await currentVersion(params.month);
		if (version !== null && version === fromEtag(known)) {
			return new Response(null, { status: 304, headers: { etag: toEtag(version) } });
		}
	}

	try {
		const parsed = await readMonth(params.month);
		if (parsed === null) error(404, 'この月のファイルがありません');
		const { version, ...body } = parsed;
		return Response.json(body, { headers: { etag: toEtag(version) } });
	} catch (e) {
		// 構文エラーは利用者が直すもの。パーサのメッセージをそのまま渡す
		if (e instanceof MonthSyntaxError) error(422, e.message);
		throw e;
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const length = Number(request.headers.get('content-length') ?? 0);
	if (length > MAX_BODY_BYTES) error(413, '本文が大きすぎます');
	const expected = precondition(request);

	let data: MonthData;
	try {
		data = (await request.json()) as MonthData;
	} catch {
		error(400, 'JSON として読めません');
	}
	if (typeof data !== 'object' || data === null || !Array.isArray(data.days)) {
		error(400, '月次データの形をしていません');
	}

	try {
		const version = await writeMonth(params.month, data, expected);
		return new Response(null, { status: 204, headers: { etag: toEtag(version) } });
	} catch (e) {
		if (e instanceof VersionMismatchError) error(412, e.message);
		if (e instanceof RoundTripError) error(500, e.message);
		throw e;
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const expected = precondition(request);
	let deleted: boolean;
	try {
		deleted = await deleteMonth(params.month, expected);
	} catch (e) {
		if (e instanceof VersionMismatchError) error(412, e.message);
		throw e;
	}
	if (!deleted) error(404, 'この月のファイルがありません');
	return new Response(null, { status: 204 });
};

/**
 * 書き込み・削除の前提とする版（SPEC.md §4.5「外部での変更との衝突」）。
 *
 * 前提なしの書き込みは受け付けない。確かめずに書く経路が残ると、外での変更を黙って
 * 上書きする元の問題に戻る。月の作成のように版がまだないときは `If-None-Match: *` を送る。
 */
function precondition(request: Request): Precondition {
	const ifMatch = request.headers.get('if-match');
	if (ifMatch !== null) return fromEtag(ifMatch);
	if (request.headers.get('if-none-match') === '*') return null;
	error(428, 'If-Match か If-None-Match: * が必要です');
}

function toEtag(version: string): string {
	return `"${version}"`;
}

function fromEtag(etag: string): string {
	return etag.replace(/^W\//, '').replace(/^"|"$/g, '');
}
