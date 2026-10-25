import { defineParams } from '@sveltejs/kit/params';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const params = defineParams({
	month: (param) => (MONTH.test(param) ? param : undefined)
});
