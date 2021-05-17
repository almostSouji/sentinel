/* eslint-disable @typescript-eslint/no-misused-promises */
import { MessageEmbed, NewsChannel, Permissions, TextChannel, User } from 'discord.js';
import { logger } from './functions/logger';
import { COLOR_DARK } from './constants';
import { Component } from './functions/experiments';
import Client from './structures/Client';
import { EXPERIMENT_BUTTONS } from './keys';
import { analyze } from './functions/analyze';

export interface ProcessEnv {
	DISCORD_TOKEN: string;
	PERSPECTIVE_TOKE: string;
	DISCORD_WEBHOOK_ID: string;
	DISCORD_WEBHOOK_TOKEN: string;
}

const client = new Client({
	intents: ['GUILD_MESSAGES', 'GUILDS'],
});
const { redis } = client;

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
