import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({ month: params.month });
