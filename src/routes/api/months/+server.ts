import { json } from '@sveltejs/kit';
import { listMonths } from '$lib/server/months';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json({ months: await listMonths() });
};
