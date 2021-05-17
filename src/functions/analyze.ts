import { Message, PartialMessage, Permissions, MessageEmbed, Client } from 'discord.js';
import { truncate, zsetZipper } from './util';
import { COLOR_MILD, COLOR_ALERT, COLOR_SEVERE } from '../constants';
import {
	CHANNELS_WATCHING,
	EXPERIMENT_IGNORE,
	ATTRIBUTES,
	ATTRIBUTES_THRESHOLD,
	ATTRIBUTES_AMOUNT,
	CHANNELS_LOG,
	ATTRIBUTES_SEVERE,
	ATTRIBUTES_SEVERE_AMOUNT,
	ATTRIBUTES_HIGH_THRESHOLD,
	ATTRIBUTES_HIGH_AMOUNT,
	NOTIF_ROLES,
	NOTIF_USERS,
	NOTIF_LEVEL,
	NOTIF_PREFIX,
	EXPERIMENT_BUTTONS_LEVEL,
	SCIENCE_MESSAGES,
	SCIENCE_REQUESTS,
} from '../keys';
import { PerspectiveAttribute, Scores } from '../types/perspective';
import { buttons } from './experiments';
import { logger } from './logger';
import { analyzeText } from './perspective';

const colors = {
	1: COLOR_MILD,
	2: COLOR_ALERT,
	3: COLOR_SEVERE,
} as const;

function formatLoad(load: number) {
	const code = load > 55 ? 31 : load > 30 ? 33 : 32;
	return `\x1b[${code}m${load.toFixed(2)}\x1b[0m`;
}

async function increment(client: Client, guild: string) {
	void client.redis.zincrby(SCIENCE_MESSAGES, 1, guild);
	const requests = await client.redis.incr(SCIENCE_REQUESTS);
	if (requests === 1) {
		void client.redis.expire(SCIENCE_REQUESTS, 60);
	} else if (requests >= 30) {
		logger.log('info', `${formatLoad(requests)}/60`);
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
		} = message;

		if (
			channel.type === 'dm' ||
			!content ||
			!guild ||
			system ||
			!['DEFAULT', 'REPLY'].includes(messageType ?? '') ||
			!author
		)
			return;

		const isWatch = await redis.sismember(CHANNELS_WATCHING(guild.id), channel.id);
		if (!isWatch) return;

		const ignorePrefix = await redis.get(EXPERIMENT_IGNORE(guild.id));
		if (ignorePrefix && content.startsWith(ignorePrefix)) return;

		const checkAttributes = await redis.zrange(ATTRIBUTES(guild.id), 0, -1);
		if (!checkAttributes.length) return;

		void increment(message.client, guild.id);
		const res = await analyzeText(content, checkAttributes as PerspectiveAttribute[]);
		const tags = [];
		let tripped = 0;
		const logThreshold = parseInt((await redis.get(ATTRIBUTES_THRESHOLD(guild.id))) ?? '0', 10);

		for (const [key, s] of Object.entries(res.attributeScores)) {
			const scores = s as Scores;
			const pair = zsetZipper(checkAttributes).find(([k]) => key === k);
			if (pair) {
				if (scores.summaryScore.value * 100 >= parseInt(pair[1], 10)) {
					tags.push({ key, score: scores.summaryScore });
				}
				if (scores.summaryScore.value * 100 >= logThreshold) {
					tripped++;
				}
			}
		}

		const attributeAmount = parseInt((await redis.get(ATTRIBUTES_AMOUNT(guild.id))) ?? '1', 10);

		if (!tags.length || tripped < attributeAmount) return;

		const logChannel = guild.channels.resolve((await redis.get(CHANNELS_LOG(guild.id))) ?? '');
		if (!logChannel || !logChannel.isText()) return;

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
		if (tags.length < parseInt((await redis.get(ATTRIBUTES_AMOUNT(guild.id))) ?? '0', 10)) return;

		const severeSet = await redis.zrange(ATTRIBUTES_SEVERE(guild.id), 0, -1, 'WITHSCORES');
		const severeAmount = parseInt((await redis.get(ATTRIBUTES_SEVERE_AMOUNT(guild.id))) ?? '1', 10);
		const highThreshold = parseInt((await redis.get(ATTRIBUTES_HIGH_THRESHOLD(guild.id))) ?? '0', 10);
		const highAmount = parseInt((await redis.get(ATTRIBUTES_HIGH_AMOUNT(guild.id))) ?? '1', 10);

		const severe = tags.filter(({ key, score }) => {
			const severeAttributes = zsetZipper(severeSet);
			return severeAttributes.some(([k, threshold]) => k === key && score.value * 100 >= parseInt(threshold, 10));
		});

		const high = tags.filter((tag) => tag.score.value * 100 >= highThreshold);
		const severityLevel = severe.length >= severeAmount ? 3 : high.length >= highAmount ? 2 : 1;
		const color = colors[severityLevel];

		const metaDataParts: string[] = [];

		metaDataParts.push(`• Channel: <#${channel.id}>`);
		metaDataParts.push(`• Message link: [jump ➔](${message.url})`);

		if (isEdit) {
			metaDataParts.push(`• Caused by message edit`);
		}

		const attachments = message.attachments;
		if (attachments.size) {
			let counter = 1;
			metaDataParts.push(
				`• Attachments (${attachments.size}): ${attachments.map((a) => `[${counter++}](${a.proxyURL})`).join(', ')}`,
			);
		}
		if (message.embeds.length) {
			metaDataParts.push(`• Embeds: ${message.embeds.length}`);
		}

		const embed = new MessageEmbed()
			.setDescription(truncate(content.replace(/\n+/g, '\n').replace(/\s+/g, ' '), 1_990))
			.setColor(color)
			.addField(
				'Attribute Flags',
				tags
					.sort((a, b) => b.score.value - a.score.value)
					.map((tag) => {
						const percent = tag.score.value * 100;
						return `• ${percent.toFixed(2)}% \`${tag.key}\``;
					})
					.join('\n'),
				true,
			)
			.addField('Metadata', metaDataParts.join('\n'), true)
			.setAuthor(
				message.author ? `${message.author.tag} (${message.author.id})` : 'Anonymous',
				message.author?.displayAvatarURL(),
			);

		const roles = await redis.smembers(NOTIF_ROLES(guild.id));
		const users = await redis.smembers(NOTIF_USERS(guild.id));
		const notificationLevel = parseInt((await redis.get(NOTIF_LEVEL(guild.id))) ?? '0', 10);
		const prefix = await redis.get(NOTIF_PREFIX(guild.id));

		const notificationParts = [...roles.map((role) => `<@&${role}>`), ...users.map((user) => `<@${user}>`)];
		const newContent = severityLevel >= notificationLevel ? `${prefix ?? ''}${notificationParts.join(', ')}` : null;

		const botPermissions = channel.permissionsFor(client.user!);
		const buttonLevelString = await redis.get(EXPERIMENT_BUTTONS_LEVEL(guild.id));
		const buttonLevel = parseInt(buttonLevelString ?? '0', 10);
		if (buttonLevelString && severityLevel >= buttonLevel) {
			buttons(client, logChannel.id, embed, author.id, message.id, newContent, botPermissions, {
				users,
				roles,
			});
			return;
		}

		void logChannel.send(newContent, {
			allowedMentions: {
				users,
				roles,
			},
			embed,
		});
	} catch (err) {
		logger.error(err);
	}
}
