/* eslint-disable @typescript-eslint/no-misused-promises */
import { Client, Message, MessageEmbed, PartialMessage, WebhookClient } from 'discord.js';
import { logger } from './logger';
import { truncate } from './util';
import { COLOR_ALERT, COLOR_MILD, COLOR_SEVERE } from './constants';
import { readFileSync } from 'fs';
import YAML from 'yaml';
import { Config } from './types/config';
import { analyzeText } from './perspective';
import { Score, Scores } from './types/perspective';

const configs = YAML.parse(readFileSync('./config.yml', 'utf8')) as Config;

export interface ProcessEnv {
	DISCORD_TOKEN: string;
	PERSPECTIVE_TOKE: string;
	DISCORD_WEBHOOK_ID: string;
	DISCORD_WEBHOOK_TOKEN: string;
}

function colorCode(num: number) {
	return num > 0.9 ? 31 : num > 0.8 ? 33 : num > 0.7 ? 36 : 32;
}

const colors = {
	1: COLOR_MILD,
	2: COLOR_ALERT,
	3: COLOR_SEVERE,
} as const;

const thresholds = {
	INSULT: 0.6,
	THREAT: 0.6,
	IDENTITY_ATTACK: 0.6,
	TOXICITY: 0.6,
	SEVERE_TOXICITY: 0.6,
	SEXUALLY_EXPLICIT: 0.6,
	FLIRTATION: 0.6,
} as const;

export type Attribute = keyof typeof thresholds;

const client = new Client({
	ws: {
		intents: ['GUILD_MESSAGES', 'GUILDS'],
	},
});

function format(key: Attribute, score: Score): string {
	return `\x1b[${colorCode(score.value)}m${key}\x1b[0m`;
}

async function analyze(message: Message | PartialMessage, isEdit = false) {
	try {
		if (message.channel.type === 'dm' || !message.content) return;

		const config = configs.guilds.find((e) => e.id === message.guild?.id);
		if (!config) {
			logger.error(`No configuration found for ${message.guild?.id ?? 'Direct Message'}!`);
			return;
		}

		const { webhook_id, webhook_token, severe_attributes, high_threshold, high_amount, monitor_channels } = config;
		const channels = monitor_channels ?? [];

		if (!channels.includes(message.channel.id)) return;

		const res = await analyzeText(message.content);
		const logTags = [];
		const tags = [];
		for (const [k, s] of Object.entries(res.attributeScores)) {
			const attribute = k as Attribute;
			const scores = s as Scores;

			if (scores.summaryScore.value > thresholds[attribute]) {
				logTags.push(format(attribute, scores.summaryScore));
				tags.push({ key: attribute, score: scores.summaryScore });
			}
		}
		logger.log(
			'rating',
			`${isEdit ? '[edit] ' : ''}${message.author?.tag ?? '[Anon Author]'} #${message.channel.name}${
				logTags.length ? ` (${logTags.join(', ')})` : ''
			}: ${message.content}`,
		);

		if (!webhook_id || !webhook_token) return;

		const hook = new WebhookClient(webhook_id, webhook_token);

		if (!tags.some((tag) => tag.score.value > 0.9)) return;

		if (!severe_attributes) {
			logger.error(`Missing severe tags data for ${message.guild?.id ?? 'Direct Message'}`);
			return;
		}

		const severe = tags.filter((tag) => {
			return severe_attributes.some((attr) => tag.key === attr.key && tag.score.value > (attr.threshold ?? 0));
		});

		const high = tags.filter((tag) => tag.score.value > (high_threshold ?? 0));
		const severityLevel = severe.length ? 3 : high.length > (high_amount ?? 0) ? 2 : 1;
		const color = colors[severityLevel];

		const embed = new MessageEmbed()
			.setDescription(truncate(message.content, 1_990))
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

		void hook.send({
			avatarURL: client.user?.displayAvatarURL(),
			username: client.user?.username,
			allowedMentions: {
				parse: [],
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

client.on('ready', () => console.log(`\x1b[32m${client.user!.tag} is watching!\x1b[0m`));

void client.login(process.env.DISCORD_TOKEN);
