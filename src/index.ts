/* eslint-disable @typescript-eslint/no-misused-promises */
import { Client, Message, MessageEmbed, PartialMessage, WebhookClient } from 'discord.js';
import { logger } from './logger';
import { truncate } from './util';
import { COLOR_ALERT, COLOR_MILD, COLOR_SEVERE } from './constants';
import { readFileSync } from 'fs';
import YAML from 'yaml';
import { Config } from './types/config';
import { analyzeText } from './perspective';
import { PerspectiveAttribute, Scores } from './types/perspective';

const configs = YAML.parse(readFileSync('./config.yml', 'utf8')) as Config;

let start = Date.now();
const messages: Map<string, number> = new Map();

function increment(guild: string) {
	const current = messages.get(guild) ?? 0;
	messages.set(guild, current + 1);
}

setInterval(() => {
	messages.clear();
	start = Date.now();
}, 60 * 60 * 1000);

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
	ws: {
		intents: ['GUILD_MESSAGES', 'GUILDS'],
	},
});

async function analyze(message: Message | PartialMessage, isEdit = false) {
	try {
		if (message.channel.type === 'dm' || !message.content) return;

		const config = configs.guilds.find((e) => e.id === message.guild?.id);
		if (!config) {
			logger.error(`No configuration found for ${message.guild?.id ?? 'Direct Message'}!`);
			return;
		}

		const {
			webhook_id,
			webhook_token,
			severe_attributes,
			monitor_attributes,
			high_threshold,
			high_amount,
			monitor_channels,
			notifications,
			attribute_threshold,
			log_threshold,
			log_amount,
			severe_amount,
		} = config;
		const channels = monitor_channels ?? [];

		if (!channels.includes(message.channel.id)) return;

		increment(message.guild?.id ?? 'dm');
		const res = await analyzeText(message.content, monitor_attributes?.map((a) => a.key) ?? []);
		const tags = [];
		for (const [k, s] of Object.entries(res.attributeScores)) {
			const attribute = k as PerspectiveAttribute;
			const scores = s as Scores;
			const trip = monitor_attributes?.some(
				(a) => a.key === attribute && scores.summaryScore.value > (a.threshold ?? attribute_threshold ?? 0),
			);

			if (trip) {
				tags.push({ key: attribute, score: scores.summaryScore });
			}
		}

		if (!webhook_id || !webhook_token) return;

		const hook = new WebhookClient(webhook_id, webhook_token);

		const considerable = tags.filter((tag) => tag.score.value >= (log_threshold ?? 0));
		if (considerable.length < (log_amount ?? 0)) return;

		const severeConfig = severe_attributes ?? [];

		const severe = tags.filter((tag) => {
			return severeConfig.some(
				(attr) => tag.key === attr.key && tag.score.value > (attr.threshold ?? attribute_threshold ?? 0),
			);
		});

		const high = tags.filter((tag) => tag.score.value > (high_threshold ?? 0));
		const severityLevel = severe.length >= (severe_amount ?? 1) ? 3 : high.length >= (high_amount ?? 1) ? 2 : 1;
		const color = colors[severityLevel];

		const embed = new MessageEmbed()
			.setDescription(truncate(message.content.replace(/\n+/g, '\n').replace(/\s+/g, ' '), 1_990))
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
			.addField(
				'Metadata',
				`• Channel: <#${message.channel.id}>${isEdit ? '\n• Message was edited' : ''}\n• [Message link](${
					message.url
				})`,
				true,
			)
			.setAuthor(message.author?.tag ?? 'Anonymous', message.author?.displayAvatarURL());

		const roles = notifications?.roles ?? [];
		const users = notifications?.users ?? [];
		const level = notifications?.level ?? 0;

		const notificationParts = [...roles.map((role) => `<@&${role}>`), ...users.map((user) => `<@${user}>`)];

		void hook.send(severityLevel >= level ? `${notifications?.prefix ?? ''}${notificationParts.join(', ')}` : null, {
			avatarURL: client.user?.displayAvatarURL(),
			username: client.user?.username,
			allowedMentions: {
				users,
				roles,
			},
			embeds: [embed],
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

function formatLoad(load: number) {
	const code = load > 60 ? 31 : load > 30 ? 33 : 32;
	return `\x1b[${code}m${load.toFixed(2)}\x1b[0m`;
}

client.on('ready', () => {
	logger.log('info', `\x1b[32m${client.user!.tag} is watching!\x1b[0m`);
	setInterval(() => {
		let total = 0;
		for (const [k, v] of messages.entries()) {
			const rate = v / ((Date.now() - start) / (1000 * 60));
			total += rate;
			logger.log(
				'info',
				`Guild ${client.guilds.resolve(k)?.name ?? 'unknown'}: checking ${formatLoad(rate)} messages/minute.`,
			);
		}
		logger.log('info', `Total load: ${formatLoad(total)} messages/minute`);
	}, 5 * 60 * 1000);
});

void client.login(process.env.DISCORD_TOKEN);
