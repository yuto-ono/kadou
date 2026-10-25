import { listMonths } from '#lib/server/months.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return Response.json({ months: await listMonths() });
};
