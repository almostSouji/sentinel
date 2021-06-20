import { Message, PartialMessage, Permissions, MessageEmbed, Snowflake } from 'discord.js';
import { concatEnumeration, mapZippedByScore, zSetZipper } from './util';
import { COLOR_MILD, COLOR_ALERT, COLOR_SEVERE, COLOR_DARK, COLOR_PURPLE } from '../constants';
import {
	CHANNELS_WATCHING,
	ATTRIBUTES,
	ATTRIBUTE_SEEN,
	CHANNELS_LOG,
	CUSTOM_FLAGS_WORDS,
	CUSTOM_FLAGS_PHRASES,
	MESSAGES_SEEN,
	MESSAGES_CHECKED,
	IMMUNITY,
	STRICTNESS,
	DEBUG_GUILDS,
} from '../keys';
import { PerspectiveAttribute, Score, Scores } from '../types/perspective';
import { logger } from './logger';
import { analyzeText, perspectiveAttributes } from './perspective';
import { sendLog } from './embed';
import { MATCH_PHRASE, VERDICT, VERDICT_NONE } from '../messages/messages';
import { IMMUNITY_LEVEL } from './commands/config';

const colors = [COLOR_MILD, COLOR_MILD, COLOR_ALERT, COLOR_SEVERE, COLOR_PURPLE] as const;

function setSeverityColor(embed: MessageEmbed, severity: number): MessageEmbed {
	return embed.setColor(colors[severity] ?? COLOR_DARK);
}

export interface AttributeHit {
	key: string;
	score: Score;
}

export enum STRICTNESS_LEVELS {
	LOW = 1,
	MEDIUM,
	HIGH,
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

export function strictnessPick(level: number, highValue: number, mediumValue: number, lowValue: number) {
	return level === STRICTNESS_LEVELS.HIGH ? highValue : level === STRICTNESS_LEVELS.MEDIUM ? mediumValue : lowValue;
}

export async function checkMessage(message: Message | PartialMessage, isEdit = false) {
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

		void redis.incr(MESSAGES_SEEN(guild?.id ?? '0'));

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

		const immunityValue = parseInt((await redis.get(IMMUNITY(guild.id))) ?? '0', 10);

		if (
			immunityValue === IMMUNITY_LEVEL.MANAGE_MESSAGES &&
			channel.permissionsFor(author)?.has(Permissions.FLAGS.MANAGE_MESSAGES)
		)
			return;

		if (
			immunityValue === IMMUNITY_LEVEL.BAN_MEMBERS &&
			channel.permissionsFor(author)?.has(Permissions.FLAGS.BAN_MEMBERS)
		)
			return;

		if (
			immunityValue === IMMUNITY_LEVEL.ADMINISTRATOR &&
			channel.permissionsFor(author)?.has(Permissions.FLAGS.ADMINISTRATOR)
		)
			return;

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		const logChannel = guild.channels.resolve(((await redis.get(CHANNELS_LOG(guild.id))) ?? '') as Snowflake);
		if (!logChannel || !logChannel.isText()) return;

		const strictness = parseInt((await redis.get(STRICTNESS(guild.id))) ?? '1', 10);
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
				void sendLog(logChannel, message, max, embed, isEdit, []);
				return;
			}
		}

		const attributes = await redis.smembers(ATTRIBUTES(guild.id));
		if (!attributes.length) return;

		void redis.incr(MESSAGES_CHECKED(guild.id));
		const res = await analyzeText(content, attributes as PerspectiveAttribute[]);

		const tags: AttributeHit[] = [];
		const high: AttributeHit[] = [];
		const severe: AttributeHit[] = [];
		let tripped = 0;

		const debug = await redis.sismember(DEBUG_GUILDS, guild.id);

		const attributeThreshold = debug ? 0 : strictnessPick(strictness, 90, 93, 95);
		const highThreshold = debug ? 0 : strictnessPick(strictness, 93, 95, 98);
		const severeThreshold = debug ? 0 : strictnessPick(strictness, 85, 88, 90);
		const attributeAmount = debug
			? 0
			: strictnessPick(strictness, attributes.length * 0.0625, attributes.length * 0.125, attributes.length * 0.1875);
		const highAmount = debug
			? 0
			: strictnessPick(strictness, attributes.length * 0.125, attributes.length * 0.1875, attributes.length * 0.25);
		const severeAmount = debug ? 0 : 1;
		const severeAttributes = ['SEVERE_TOXICITY', 'IDENTITY_ATTACK'];

		for (const [key, s] of Object.entries(res.attributeScores)) {
			const scores = s as Scores;
			const scorePercent = scores.summaryScore.value * 100;

			tags.push({ key, score: scores.summaryScore });
			void redis.incr(ATTRIBUTE_SEEN(guild.id, key));

			if (scorePercent >= highThreshold) {
				high.push({ key, score: scores.summaryScore });
			}
			if (severeAttributes.some((attribute) => attribute === key) && scorePercent >= severeThreshold) {
				severe.push({ key, score: scores.summaryScore });
			}
			if (scorePercent >= attributeThreshold) {
				tripped++;
			}
		}

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
