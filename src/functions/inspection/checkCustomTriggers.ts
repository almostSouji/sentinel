import { Guild } from 'discord.js';
import { CUSTOM_FLAGS_WORDS, CUSTOM_FLAGS_PHRASES } from '../../keys';
import { mapZippedByScore, zSetZipper } from '../util';

export interface CustomTriggerResult {
	word?: string;
	phrase?: string;
	severity: number;
}
export async function checkCustomTriggers(content: string, guild: Guild): Promise<CustomTriggerResult[]> {
	const { redis } = guild.client;
	const words = zSetZipper(await redis.zrange(CUSTOM_FLAGS_WORDS(guild.id), 0, -1, 'WITHSCORES'), true);
	const phrases = zSetZipper(await redis.zrange(CUSTOM_FLAGS_PHRASES(guild.id), 0, -1, 'WITHSCORES'));
	const mapByScore = mapZippedByScore([...words, ...phrases]);
	const mapKeys = [...mapByScore.keys()].sort((a, b) => b - a);

	if (mapByScore.size) {
		const matches = [];
		for (const score of mapKeys) {
			const reg = RegExp(`(?<s${score}>${(mapByScore.get(score) ?? []).join('|')})`, 'gi');
			const match = reg.exec(content);
			if (match) {
				for (const [key, value] of Object.entries(match.groups ?? {})) {
					const severity = parseInt(key.slice(1), 10);

					if (words.some(([key]) => key.toLowerCase() === `\\b${value.toLowerCase()}\\b`)) {
						matches.push({
							word: value,
							severity,
						});
					} else {
						matches.push({
							phrase: value,
							severity,
						});
					}
				}
			}
		}
		return matches;
	}
	return [];
}
