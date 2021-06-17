import { Message, PartialMessage, Permissions, MessageEmbed } from 'discord.js';
import { concatEnumeration, mapZippedByScore, zSetZipper } from './util';
import { COLOR_MILD, COLOR_ALERT, COLOR_SEVERE, COLOR_DARK, COLOR_PURPLE } from '../constants';
import {
	CHANNELS_WATCHING,
	EXPERIMENT_IGNORE,
	ATTRIBUTES,
	ATTRIBUTES_THRESHOLD,
	ATTRIBUTES_AMOUNT,
	ATTRIBUTE_SEEN,
	CHANNELS_LOG,
	ATTRIBUTES_SEVERE,
	ATTRIBUTES_SEVERE_AMOUNT,
	ATTRIBUTES_HIGH_THRESHOLD,
	ATTRIBUTES_HIGH_AMOUNT,
	CUSTOM_FLAGS_WORDS,
	CUSTOM_FLAGS_PHRASES,
	MESSAGES_SEEN,
	MESSAGES_CHECKED,
	EXPERIMENT_IMMUNITY,
} from '../keys';
import { PerspectiveAttribute, Score, Scores } from '../types/perspective';
import { logger } from './logger';
import { analyzeText, perspectiveAttributes } from './perspective';
import { sendLog } from './embed';
import { MATCH_PHRASE, VERDICT, VERDICT_NONE } from '../messages/messages';

const colors = [COLOR_MILD, COLOR_MILD, COLOR_ALERT, COLOR_SEVERE, COLOR_PURPLE] as const;

function setSeverityColor(embed: MessageEmbed, severity: number): MessageEmbed {
	return embed.setColor(colors[severity] ?? COLOR_DARK);
}

interface AttributeHit {
	key: string;
	score: Score;
}

function mapKeyToAdverb(key: string): string {
	switch (key) {
		case 'TOXICITY':
			return 'toxic';
		case 'SEVERE_TOXICITY':
			return 'severely toxic';
		case 'IDENTITY_ATTACK':
			return "attacking someone's identity";
		case 'INSULT':
			return 'insulting';
		case 'PROFANITY':
			return 'profane';
		case 'THREAT':
			return 'threatening';
		case 'SEXUALLY_EXPLICIT':
			return 'sexually explicit';
		case 'FLIRTATION':
			return 'flirtatious';
		case 'ATTACK_ON_AUTHOR':
		case 'ATTACK_ON_COMMENTER':
			return 'attacking someone';
		case 'INCOHERENT':
			return 'incoherent';
		case 'INFLAMMATORY':
			return 'inflammatory';
		case 'LIKELY_TO_REJECT':
			return 'rejected by New York Times moderators';
		case 'OBSCENE':
			return 'obscene';
		case 'SPAM':
			return 'spam';
		case 'UNSUBSTANTIAL':
			return 'unsubstantial';
		default:
			return `\`${key}\``;
	}
}

export async function analyze(message: Message | PartialMessage, isEdit = false) {
	try {
		const {
			client,
			client: { redis },
			content,
			channel,
			guild,
			system,
			type: messageType,
			author,
			member: authorAsMember,
		} = message;

		void redis.incr(MESSAGES_SEEN(guild?.id ?? 'dm'));

		if (
			channel.type === 'dm' ||
			!content ||
			!guild ||
			system ||
			!['DEFAULT', 'REPLY'].includes(messageType ?? '') ||
			!author ||
			!authorAsMember
		)
			return;

		const isWatch = await redis.sismember(CHANNELS_WATCHING(guild.id), channel.id);
		if (!isWatch) return;

		const immunity = await redis.smembers(EXPERIMENT_IMMUNITY(guild.id));
		if (immunity.some((id) => author.id === id || authorAsMember.roles.cache.has(id))) return;

		const ignorePrefix = await redis.get(EXPERIMENT_IGNORE(guild.id));
		if (ignorePrefix && content.startsWith(ignorePrefix)) return;

		const logChannel = guild.channels.resolve((await redis.get(CHANNELS_LOG(guild.id))) ?? '');
		if (!logChannel || !logChannel.isText()) return;

		const embed = new MessageEmbed();

		const words = zSetZipper(await redis.zrange(CUSTOM_FLAGS_WORDS(guild.id), 0, -1, 'WITHSCORES'), true);
		const phrases = zSetZipper(await redis.zrange(CUSTOM_FLAGS_PHRASES(guild.id), 0, -1, 'WITHSCORES'));
		const mapByScore = mapZippedByScore([...words, ...phrases]);
		const mapKeys = [...mapByScore.keys()].sort((a, b) => b - a);

		if (mapByScore.size) {
			const matchParts = [];
			const matchLevels = [];
			for (const score of mapKeys) {
				const reg = RegExp(`(?<s${score}>${(mapByScore.get(score) ?? []).join('|')})`, 'gi');
				const match = reg.exec(content);
				if (match) {
					for (const [key, value] of Object.entries(match.groups ?? {})) {
						const level = parseInt(key.slice(1), 10);
						matchLevels.push(level);
						matchParts.push(
							MATCH_PHRASE(
								value,
								level,
								words.some(([key]) => key.toLowerCase() === `\\b${value.toLowerCase()}\\b`),
							),
						);
					}
				}
			}

			if (matchLevels.length) {
				const max = Math.max(...matchLevels);
				setSeverityColor(embed, max);
				embed.addField('Custom Filter', matchParts.join('\n'));
				// TODO: custom attribute does not have
				void sendLog(logChannel, message, max, embed, isEdit, []);
				return;
			}
		}

		const checkAttributes = await redis.zrange(ATTRIBUTES(guild.id), 0, -1, 'WITHSCORES');
		if (!checkAttributes.length) return;

		void redis.incr(MESSAGES_CHECKED(guild.id));
		const res = await analyzeText(
			content,
			checkAttributes.filter((a) => isNaN(parseInt(a, 10))) as PerspectiveAttribute[],
		);

		const tags: AttributeHit[] = [];
		const high: AttributeHit[] = [];
		const severe: AttributeHit[] = [];
		let tripped = 0;

		const logThreshold = parseInt((await redis.get(ATTRIBUTES_THRESHOLD(guild.id))) ?? '0', 10);
		const severeSet = await redis.zrange(ATTRIBUTES_SEVERE(guild.id), 0, -1, 'WITHSCORES');
		const severeAmount = parseInt((await redis.get(ATTRIBUTES_SEVERE_AMOUNT(guild.id))) ?? '1', 10);
		const highThreshold = parseInt((await redis.get(ATTRIBUTES_HIGH_THRESHOLD(guild.id))) ?? '0', 10);
		const highAmount = parseInt((await redis.get(ATTRIBUTES_HIGH_AMOUNT(guild.id))) ?? '1', 10);
		const severeAttributes = zSetZipper(severeSet);

		for (const [key, s] of Object.entries(res.attributeScores)) {
			const scores = s as Scores;
			const scorePercent = scores.summaryScore.value * 100;

			tags.push({ key, score: scores.summaryScore });
			void redis.incr(ATTRIBUTE_SEEN(guild.id, key));

			if (scorePercent >= highThreshold) {
				high.push({ key, score: scores.summaryScore });
			}
			if (severeAttributes.some(([k, threshold]) => k === key && scorePercent >= threshold)) {
				severe.push({ key, score: scores.summaryScore });
			}
			if (scorePercent >= logThreshold) {
				tripped++;
			}
		}

		const attributeAmount = parseInt((await redis.get(ATTRIBUTES_AMOUNT(guild.id))) ?? '1', 10);
		if (tripped < attributeAmount && !severe.length) return;

		const hasPerms =
			logChannel
				.permissionsFor(client.user!)
				?.has([
					Permissions.FLAGS.VIEW_CHANNEL,
					Permissions.FLAGS.SEND_MESSAGES,
					Permissions.FLAGS.EMBED_LINKS,
					Permissions.FLAGS.READ_MESSAGE_HISTORY,
				]) ?? false;
		if (!hasPerms) return;

		const severityLevel = severe.length >= severeAmount ? 3 : high.length >= highAmount ? 2 : 1;

		setSeverityColor(embed, severityLevel);

		embed.addField(
			'Verdict',
			`${
				high.length
					? VERDICT(
							concatEnumeration(high.sort((a, b) => b.score.value - a.score.value).map((e) => mapKeyToAdverb(e.key))),
					  )
					: `${VERDICT_NONE}`
			}`,
			true,
		);

		void sendLog(
			logChannel,
			message,
			severityLevel,
			embed,
			isEdit,
			perspectiveAttributes.map((a) => Math.round((tags.find((t) => t.key === a)?.score.value ?? 0) * 10000)),
		);
	} catch (err) {
		logger.error(err);
	}
}
