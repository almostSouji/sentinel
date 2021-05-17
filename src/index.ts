/* eslint-disable @typescript-eslint/no-misused-promises */
import { Message, MessageEmbed, NewsChannel, PartialMessage, Permissions, TextChannel, User } from 'discord.js';
import { logger } from './logger';
import { truncate } from './util';
import { COLOR_ALERT, COLOR_DARK, COLOR_MILD, COLOR_SEVERE } from './constants';
import { analyzeText } from './perspective';
import { PerspectiveAttribute, Scores } from './types/perspective';
import { buttons, Component } from './experiments';
import Client from './structures/Client';
import {
	ATTRIBUTES,
	ATTRIBUTES_AMOUNT,
	ATTRIBUTES_HIGH_AMOUNT,
	ATTRIBUTES_HIGH_THRESHOLD,
	ATTRIBUTES_SEVERE,
	ATTRIBUTES_SEVERE_AMOUNT,
	ATTRIBUTES_THRESHOLD,
	CHANNELS_LOG,
	CHANNELS_WATCHING,
	EXPERIMENT_BUTTONS,
	EXPERIMENT_BUTTONS_LEVEL,
	EXPERIMENT_IGNORE,
	NOTIF_LEVEL,
	NOTIF_PREFIX,
	NOTIF_ROLES,
	NOTIF_USERS,
	SCIENCE_MESSAGES,
	SCIENCE_REQUESTS,
} from './keys';

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

export interface ProcessEnv {
	DISCORD_TOKEN: string;
	PERSPECTIVE_TOKE: string;
	DISCORD_WEBHOOK_ID: string;
	DISCORD_WEBHOOK_TOKEN: string;
}

const colors = {
	1: COLOR_MILD,
	2: COLOR_ALERT,
	3: COLOR_SEVERE,
} as const;

const client = new Client({
	intents: ['GUILD_MESSAGES', 'GUILDS'],
});
const { redis } = client;

async function analyze(message: Message | PartialMessage, isEdit = false) {
	try {
		const { content, channel, guild, system, type: messageType, author } = message;

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

		const attributes = await redis.zrange(ATTRIBUTES(guild.id), 0, -1, 'WITHSCORES');
		for (const [k, s] of Object.entries(res.attributeScores)) {
			const scores = s as Scores;
			const index = attributes.findIndex((a) => a === k);
			if (index > -1) {
				const threshold = attributes[index + 1];
				if (scores.summaryScore.value * 100 > parseInt(threshold, 10)) {
					tags.push({ key: k, score: scores.summaryScore });
				}
				if (scores.summaryScore.value * 100 > logThreshold) {
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

		const severeAttributes = await redis.zrange(ATTRIBUTES_SEVERE(guild.id), 0, -1, 'WITHSCORES');
		const severeAmount = parseInt((await redis.get(ATTRIBUTES_SEVERE_AMOUNT(guild.id))) ?? '1', 10);
		const highThreshold = parseInt((await redis.get(ATTRIBUTES_HIGH_THRESHOLD(guild.id))) ?? '0', 10);
		const highAmount = parseInt((await redis.get(ATTRIBUTES_HIGH_AMOUNT(guild.id))) ?? '1', 10);

		const severe = tags.filter(({ key, score }) => {
			const index = severeAttributes.findIndex((a) => a === key);
			if (index > -1) {
				const threshold = severeAttributes[index + 1];
				return score.value * 100 >= parseInt(threshold, 10);
			}
			return false;
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

client.on('message', (message) => {
	if (message.author.bot || !message.content.length || message.channel.type !== 'text') return;
	void analyze(message);
});

client.on('messageUpdate', (oldMessage, newMessage) => {
	if (oldMessage.content === newMessage.content || newMessage.author?.bot || newMessage.channel.type !== 'text') return;
	void analyze(newMessage, true);
});

client.on('ready', () => {
	logger.log('info', `\x1b[32m${client.user!.tag} is watching!\x1b[0m`);
});

client.ws.on('INTERACTION_CREATE', async (data: any) => {
	if (data.type !== 3) return; // only allow buttons
	const guild = client.guilds.cache.get(data.guild_id);
	if (!guild) return;

	const executor = new User(client, data.member.user);
	const messageParts: string[] = [];
	const components: Component[] = [];

	if (!data.message.components?.[0]?.components?.some((c: any) => c.custom_id === data.data.custom_id)) return;

	const [op, target, secondaryTarget] = data.data.custom_id.split('-');
	if (op === 'ban' || op === 'ban_and_delete') {
		if (
			(await redis.get(EXPERIMENT_BUTTONS(guild.id))) === 'check' &&
			!new Permissions(BigInt(data.member.permissions)).has('BAN_MEMBERS')
		)
			return;
		try {
			const user = await client.users.fetch(target);
			messageParts.push(`• \`${executor.tag}\` banned \`${user.tag}\``);
		} catch {
			messageParts.push(`• \`${executor.tag}\` could not ban \`${target as string}\``);
		}
	}

	if (op === 'ban_and_delete' || op === 'delete') {
		const [c, m] = secondaryTarget.split('/');
		const channel = client.channels.cache.get(c) as TextChannel | NewsChannel | undefined;
		if (
			(await redis.get(EXPERIMENT_BUTTONS(guild.id))) === 'check' &&
			!channel?.permissionsFor(executor)?.has('MANAGE_MESSAGES')
		)
			return;
		if (!channel || !channel.isText()) return;
		try {
			await channel.messages.delete(m);
			messageParts.push(`• \`${executor.tag}\` deleted the message`);
		} catch {
			messageParts.push(`• \`${executor.tag}\` could not delete the message`);
		}
	}

	if (op === 'delete') {
		if (guild.me?.permissions.has('BAN_MEMBERS')) {
			components.push({
				type: 2,
				style: 4,
				custom_id: `ban-${target as string}-${secondaryTarget as string}`,
				label: 'Ban',
				emoji: {
					id: '842716245203091476',
				},
			});
			components.push({
				type: 2,
				style: 2,
				custom_id: `dismiss`,
				label: 'Dismiss',
			});
		}
	}

	const messageData = data.message;
	messageData.components = null;
	const embed = messageData?.embeds[0];

	if (!embed) return;
	const e = new MessageEmbed(embed);

	if (op === 'dismiss') {
		if (
			(await redis.get(EXPERIMENT_BUTTONS(guild.id))) === 'check' &&
			!new Permissions(BigInt(data.member.permissions)).has('MANAGE_MESSAGES')
		)
			return;
		messageParts.push(`• \`${executor.tag}\` dismissed buttons`);
	}

	if (op === 'approve') {
		if (
			(await redis.get(EXPERIMENT_BUTTONS(guild.id))) === 'check' &&
			!new Permissions(BigInt(data.member.permissions)).has('MANAGE_MESSAGES')
		)
			return;
		messageParts.push(`• \`${executor.tag}\` approved this message`);
		e.setColor(COLOR_DARK);
	}

	e.setFooter(`Last action by ${executor.tag}`, executor.displayAvatarURL());

	if (messageParts.length) {
		const actionFieldIndex = e.fields.findIndex((field: any) => field.name === 'Actions');
		if (actionFieldIndex < 0) {
			e.addField('Actions', messageParts.join('\n'));
		} else {
			e.spliceFields(actionFieldIndex, 1, {
				name: 'Actions',
				value: `${e.fields[actionFieldIndex].value}\n${messageParts.join('\n')}`,
			});
		}
	}

	const responseData: any = {
		content: data.message.content || null,
		embeds: [e.toJSON()],
		components: [],
	};

	if (components.length) {
		responseData.components = [
			{
				type: 1,
				components,
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/dot-notation
	const api = client['api'] as any;
	api.interactions(data.id, data.token).callback.post({
		data: {
			data: responseData,
			type: 7,
		},
	});
});

void client.login(process.env.DISCORD_TOKEN);
