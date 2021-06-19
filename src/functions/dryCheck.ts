import { Snowflake, Client } from 'discord.js';
import { ATTRIBUTES } from '../keys';
import { PerspectiveAttribute, Scores } from '../types/perspective';
import { AttributeHit } from './checkMessage';
import { analyzeText, perspectiveAttributes } from './perspective';

export async function dryCheck(content: string, client: Client, guildId: Snowflake): Promise<number[] | null> {
	const tags: AttributeHit[] = [];
	const { redis } = client;

	const attributes = await redis.smembers(ATTRIBUTES(guildId));
	if (!attributes.length) return null;

	const res = await analyzeText(content, attributes as PerspectiveAttribute[]);
	for (const [key, s] of Object.entries(res.attributeScores)) {
		const scores = s as Scores;
		tags.push({ key, score: scores.summaryScore });
	}
	return perspectiveAttributes.map((a) => Math.round((tags.find((t) => t.key === a)?.score.value ?? 0) * 10000));
}
