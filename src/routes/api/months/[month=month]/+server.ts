import { error, json } from '@sveltejs/kit';
import type { MonthData } from '$lib/domain/types';
import { MonthSyntaxError } from '$lib/persistence/month-parse';
import { deleteMonth, readMonth, RoundTripError, writeMonth } from '$lib/server/months';
import type { RequestHandler } from './$types';

/** 壊れたボディで正しいファイルを置き換えないための、ごく粗い上限 */
const MAX_BODY_BYTES = 1_000_000;

export const GET: RequestHandler = async ({ params }) => {
	try {
		const parsed = await readMonth(params.month);
		if (parsed === null) error(404, 'この月のファイルがありません');
		return json(parsed);
	} catch (e) {
		// 構文エラーは利用者が直すもの。パーサのメッセージをそのまま渡す
		if (e instanceof MonthSyntaxError) error(422, e.message);
		throw e;
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const length = Number(request.headers.get('content-length') ?? 0);
	if (length > MAX_BODY_BYTES) error(413, '本文が大きすぎます');

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
		await writeMonth(params.month, data);
	} catch (e) {
		if (e instanceof RoundTripError) error(500, e.message);
		throw e;
	}
	return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async ({ params }) => {
	if (!(await deleteMonth(params.month))) error(404, 'この月のファイルがありません');
	return new Response(null, { status: 204 });
};
