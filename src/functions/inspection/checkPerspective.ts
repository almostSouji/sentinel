import { GuildSettings, GuildSettingFlags } from '../../types/DataTypes';
import { PerspectiveAttribute, Scores } from '../../types/perspective';
import { STRICTNESS_LEVELS, AttributeHit } from '../checkMessage';
import { analyzeText, forcedAttributes, nsfwAtrributes, perspectiveAttributes } from '../perspective';

export function strictnessPick(level: number, highValue: number, mediumValue: number, lowValue: number) {
	return level === STRICTNESS_LEVELS.HIGH ? highValue : level === STRICTNESS_LEVELS.MEDIUM ? mediumValue : lowValue;
}

export interface PerspectiveResult {
	tags: AttributeHit[];
	high: AttributeHit[];
	severe: AttributeHit[];
}

export async function checkPerspective(
	content: string,
	settings: GuildSettings,
	nsfw = false,
	communityId?: string,
): Promise<PerspectiveResult> {
	const attributes = [...new Set([...settings.attributes, ...forcedAttributes])];
	const logOverride = settings.flags.includes(GuildSettingFlags.LOG_ALL);

	const res = await analyzeText(
		content,
		(logOverride
			? perspectiveAttributes
			: nsfw
			? attributes.filter((a) => !nsfwAtrributes.includes(a))
			: attributes) as PerspectiveAttribute[],
		communityId,
	);

	const tags: AttributeHit[] = [];
	const high: AttributeHit[] = [];
	const severe: AttributeHit[] = [];

	const highThreshold = strictnessPick(settings.strictness, 93, 95, 98);
	const severeThreshold = strictnessPick(settings.strictness, 85, 88, 90);

	for (const [key, s] of Object.entries(res.attributeScores)) {
		const scores = s as Scores;
		const scorePercent = scores.summaryScore.value * 100;

		tags.push({ key, score: scores.summaryScore });

		const isSevere = forcedAttributes.some((attribute) => attribute === key) && scorePercent >= severeThreshold;

		if (scorePercent >= highThreshold || isSevere) {
			high.push({ key, score: scores.summaryScore });
		}
		if (isSevere) {
			severe.push({ key, score: scores.summaryScore });
		}
	}

	return {
		tags,
		high,
		severe,
	};
}
