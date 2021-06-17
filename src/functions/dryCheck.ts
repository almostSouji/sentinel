import { Snowflake, Client } from 'discord.js';
import { ATTRIBUTES } from '../keys';
import { PerspectiveAttribute, Scores } from '../types/perspective';
import { AttributeHit } from './checkMessage';
import { analyzeText, perspectiveAttributes } from './perspective';

export async function dryCheck(content: string, client: Client, guildId: Snowflake): Promise<number[] | null> {
	const tags: AttributeHit[] = [];
	const { redis } = client;

	const checkAttributes = await redis.zrange(ATTRIBUTES(guildId), 0, -1, 'WITHSCORES');
	if (!checkAttributes.length) return null;
	const res = await analyzeText(
		content,
		checkAttributes.filter((a) => isNaN(parseInt(a, 10))) as PerspectiveAttribute[],
	);
	for (const [key, s] of Object.entries(res.attributeScores)) {
		const scores = s as Scores;
		tags.push({ key, score: scores.summaryScore });
	}
	return perspectiveAttributes.map((a) => Math.round((tags.find((t) => t.key === a)?.score.value ?? 0) * 10000));
}
