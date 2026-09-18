import type { ParamMatcher } from '@sveltejs/kit';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const match = ((param: string) => MONTH.test(param)) satisfies ParamMatcher;
