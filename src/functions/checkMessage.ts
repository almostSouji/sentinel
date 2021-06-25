import { Message, PartialMessage, Permissions, MessageEmbed, Snowflake } from 'discord.js';
import { COLOR_MILD, COLOR_ALERT, COLOR_SEVERE, COLOR_DARK, COLOR_PURPLE } from '../constants';
import {
	CHANNELS_WATCHING,
	ATTRIBUTES,
	CHANNELS_LOG,
	MESSAGES_SEEN,
	MESSAGES_CHECKED,
	IMMUNITY,
	STRICTNESS,
	DEBUG_GUILDS,
} from '../keys';
import { Score } from '../types/perspective';
import { logger } from './logger';
import { forcedAttributes, perspectiveAttributes } from './perspective';
import { sendLog } from './sendLog';
import { IMMUNITY_LEVEL } from './commands/config';
import { checkContent } from './inspection/checkContent';
import { formatPerspectiveShort } from './formatting/formatPerspective';
import { MATCH_PHRASE } from '../messages/messages';
import { levelIdentifier } from './commands/notify';

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

export function strictnessPick(level: number, highValue: number, mediumValue: number, lowValue: number) {
	return level === STRICTNESS_LEVELS.HIGH ? highValue : level === STRICTNESS_LEVELS.MEDIUM ? mediumValue : lowValue;
}

export async function checkMessage(message: Message | PartialMessage, isEdit = false) {
	try {
		const {
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

		const debug = await redis.sismember(DEBUG_GUILDS, guild.id);
		void redis.incr(MESSAGES_CHECKED(guild.id));
		const attributes = [...new Set([...(await redis.smembers(ATTRIBUTES(guild.id))), ...forcedAttributes])];

		const attributeThreshold = strictnessPick(strictness, 90, 93, 95);
		const highThreshold = strictnessPick(strictness, 93, 95, 98);
		const severeThreshold = strictnessPick(strictness, 85, 88, 90);
		const attributeAmount = Math.ceil(
			strictnessPick(strictness, attributes.length * 0.0625, attributes.length * 0.125, attributes.length * 0.1875),
		);
		const highAmount = Math.ceil(
			strictnessPick(strictness, attributes.length * 0.125, attributes.length * 0.1875, attributes.length * 0.25),
		);
		const severeAmount = 1;

		const { customTrigger, perspective } = await checkContent(content, guild);
		const { severe, high, tags } = perspective;

		if (customTrigger.length) {
			embed.addField(
				'Custom Trigger',
				customTrigger
					.map((trigger) =>
						MATCH_PHRASE(
							trigger.word ?? trigger.phrase ?? '',
							levelIdentifier(trigger.severity),
							Boolean(trigger.word),
						),
					)
					.join('\n'),
			);
		}

		if (high.length < attributeAmount && !severe.length && !customTrigger.length) return;

		const perspectiveSeverity = severe.length >= severeAmount ? 3 : high.length >= highAmount ? 2 : 1;
		const customSeverity = Math.max(...customTrigger.map((e) => e.severity), -1);
		const severityLevel = Math.max(perspectiveSeverity, customSeverity);

		setSeverityColor(embed, severityLevel);

		embed.addField('Flags', formatPerspectiveShort(perspective));

		if (debug) {
			embed.addField(
				'@debug(attribute)',
				[
					`• Amount: \`${attributeAmount}\``,
					`• Threshold: \`${attributeThreshold}%\``,
					`• Result: \`${tags.length}\``,
				].join('\n'),
				true,
			);
			embed.addField(
				'@debug(high)',
				[`• Amount: \`${highAmount}\``, `• Threshold:  \`${highThreshold}%\``, `• Result:  \`${high.length}\``].join(
					'\n',
				),
				true,
			);
			embed.addField(
				'@debug(severe)',
				[
					`• Amount: \`${severeAmount}\``,
					`• Threshold: \`${severeThreshold}%\``,
					`• Result: \`${severe.length}\``,
				].join('\n'),
				true,
			);
			embed.addField(
				'@debug(misc)',
				[
					`• Immunity: \`${IMMUNITY_LEVEL[immunityValue]}\` \`(${immunityValue})\``,
					`• Strictness: \`${STRICTNESS_LEVELS[strictness]}\` \`(${strictness})\``,
					`• Severity (P): \`${perspectiveSeverity}\``,
					`• Severity (C): \`${customSeverity}\``,
					`• Severity: ${levelIdentifier(severityLevel)} \`(${severityLevel})\``,
				].join('\n'),
				true,
			);
		}

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
