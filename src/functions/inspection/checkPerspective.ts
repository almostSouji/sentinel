import { Guild } from 'discord.js';
import { ATTRIBUTES, ATTRIBUTE_SEEN, DEBUG_GUILDS_LOGALL, STRICTNESS } from '../../keys';
import { PerspectiveAttribute, Scores } from '../../types/perspective';
import { STRICTNESS_LEVELS, AttributeHit } from '../checkMessage';
import { analyzeText, forcedAttributes, perspectiveAttributes } from '../perspective';

export function strictnessPick(level: number, highValue: number, mediumValue: number, lowValue: number) {
	return level === STRICTNESS_LEVELS.HIGH ? highValue : level === STRICTNESS_LEVELS.MEDIUM ? mediumValue : lowValue;
}

export interface PerspectiveResult {
	tags: AttributeHit[];
	high: AttributeHit[];
	severe: AttributeHit[];
	tripped: number;
}

export async function checkPerspective(content: string, guild: Guild): Promise<PerspectiveResult> {
	const { redis } = guild.client;
	const strictness = parseInt((await redis.get(STRICTNESS(guild.id))) ?? '1', 10);
	const logOverride = await redis.sismember(DEBUG_GUILDS_LOGALL, guild.id);
	const attributes = [...new Set([...(await redis.smembers(ATTRIBUTES(guild.id))), ...forcedAttributes])];

	const res = await analyzeText(content, (logOverride ? perspectiveAttributes : attributes) as PerspectiveAttribute[]);

	const tags: AttributeHit[] = [];
	const high: AttributeHit[] = [];
	const severe: AttributeHit[] = [];
	let tripped = 0;

	const attributeThreshold = strictnessPick(strictness, 90, 93, 95);
	const highThreshold = strictnessPick(strictness, 93, 95, 98);
	const severeThreshold = strictnessPick(strictness, 85, 88, 90);

	for (const [key, s] of Object.entries(res.attributeScores)) {
		const scores = s as Scores;
		const scorePercent = scores.summaryScore.value * 100;

		tags.push({ key, score: scores.summaryScore });
		void redis.incr(ATTRIBUTE_SEEN(guild.id, key));

		const isSevere = forcedAttributes.some((attribute) => attribute === key) && scorePercent >= severeThreshold;

		if (scorePercent >= highThreshold || isSevere) {
			high.push({ key, score: scores.summaryScore });
		}
		if (isSevere) {
			severe.push({ key, score: scores.summaryScore });
		}
		if (scorePercent >= attributeThreshold || isSevere) {
			tripped++;
		}
	}

	return {
		tags,
		high,
		severe,
		tripped,
	};
}
