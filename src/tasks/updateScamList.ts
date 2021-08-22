import fetch from 'node-fetch';
import { logger } from '../utils/logger';
import { Client } from 'discord.js';

export async function updateScamList(client: Client<true>) {
	try {
		const list = await fetch(process.env.SCAM_URL_REMOTE_URL!).then((r) => r.json());
		logger.info(
			`updating scam domain list: before: ${String(client.listDict.get('scamdomains')!.length)} after: ${String(
				list.length,
			)}`,
		);
		client.listDict.set('scamdomains', list);
	} catch (error) {
		logger.error(error);
	}
}
