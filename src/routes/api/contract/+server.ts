import { error, json } from '@sveltejs/kit';
import { ContractSyntaxError, parseContract } from '$lib/persistence/contract-parse';
import { readTextFile } from '$lib/server/files';
import { contractPath } from '$lib/server/paths';
import type { RequestHandler } from './$types';

/**
 * contract.yaml を読む。
 *
 * 書き込みの経路は持たない。不在時は雛形を画面に表示し、利用者が自分でファイルを
 * 作る（SPEC.md §4.5）。
 */
export const GET: RequestHandler = async () => {
	const file = await readTextFile(contractPath());
	if (file === null) error(404, 'contract.yaml がありません');

	try {
		return json({ data: parseContract(file.text) });
	} catch (e) {
		if (e instanceof ContractSyntaxError) error(422, e.message);
		throw e;
	}
};
