/* eslint-disable @typescript-eslint/no-misused-promises */
import { MessageEmbed, Permissions, User, GuildMember } from 'discord.js';

import {
	BUTTON_ACTION_APPROVE,
	BUTTON_ACTION_BAN,
	BUTTON_ACTION_DELETE,
	BUTTON_ACTION_DISMISS,
	COLOR_DARK,
} from './constants';
import { banButton, checkAndApplyNotice, Component, deleteButton, dismissButton } from './functions/buttons';
import Client from './structures/Client';
import { EXPERIMENT_BUTTONS } from './keys';
import { analyze } from './functions/analyze';
import {
	APPROVED,
	BAN_FAIL,
	BAN_SUCCESS,
	DELETE_FAIL,
	DELETE_SUCCESS,
	DISMISSED,
	LOG_FOOTER_TEXT,
	READY_LOG,
} from './messages/messages';
import { logger } from './functions/logger';

export interface ProcessEnv {
	DISCORD_TOKEN: string;
	PERSPECTIVE_TOKE: string;
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
	logger.info(`${READY_LOG(client.user!.tag)}`);
});

client.ws.on('INTERACTION_CREATE', async (data: any) => {
	if (data.type !== 3) return; // only allow buttons
	const guild = client.guilds.cache.get(data.guild_id);
	if (!guild) return;
	const embed = data.message?.embeds[0];

	if (!embed) return;
	const e = new MessageEmbed(embed);

	const executor = new User(client, data.member.user);
	try {
		await guild.members.fetch({
			user: [executor, client.user!],
		});
	} catch (err) {
		return;
	}
	const messageParts: string[] = [];
	const components: Component[] = [];

	if (!data.message.components?.[0]?.components?.some((c: any) => c.custom_id === data.data.custom_id)) return;

	const [op, target, secondaryTarget] = data.data.custom_id.split('-');
	if (secondaryTarget) {
		const [c, m] = secondaryTarget.split('/');
		const channel = guild.channels.cache.get(c);
		const botPermissionsInButtonTargetChannel = channel?.permissionsFor(client.user!) ?? null;
		const shouldCheckPermissions = (await redis.get(EXPERIMENT_BUTTONS(guild.id))) === 'check';
		if (op === BUTTON_ACTION_BAN) {
			if (shouldCheckPermissions && !new Permissions(BigInt(data.member.permissions)).has('BAN_MEMBERS')) return;
			try {
				const user = await guild.members.ban(target, {
					days: 1,
				});
				messageParts.push(
					BAN_SUCCESS(
						executor.tag,
						user instanceof GuildMember ? user.user.tag : user instanceof User ? user.tag : user,
					),
				);
			} catch {
				messageParts.push(BAN_FAIL(executor.tag, target as string));
				if (channel?.isText()) {
					checkAndApplyNotice(e, 'MANAGE_MESSAGES', botPermissionsInButtonTargetChannel);
					components.push(
						deleteButton(target, c, m, botPermissionsInButtonTargetChannel?.has('MANAGE_MESSAGES') ?? false),
					);
				}
			}
		}
		if (op === BUTTON_ACTION_DELETE) {
			if (shouldCheckPermissions && !channel?.permissionsFor(executor)?.has('MANAGE_MESSAGES')) return;
			if (channel?.isText()) {
				try {
					await channel.messages.delete(m);
					messageParts.push(DELETE_SUCCESS(executor.tag));
				} catch {
					messageParts.push(DELETE_FAIL(executor.tag));
				} finally {
					checkAndApplyNotice(e, 'BAN_MEMBERS', botPermissionsInButtonTargetChannel);
					components.push(banButton(target, c, m, botPermissionsInButtonTargetChannel?.has('BAN_MEMBERS') ?? false));
				}
			}
		}
	}

	if (components.length) {
		components.push(dismissButton);
	}

	if (op === BUTTON_ACTION_DISMISS) {
		if (
			(await redis.get(EXPERIMENT_BUTTONS(guild.id))) === 'check' &&
			!new Permissions(BigInt(data.member.permissions)).has('MANAGE_MESSAGES')
		)
			return;
		messageParts.push(DISMISSED(executor.tag));
	}

	if (op === BUTTON_ACTION_APPROVE) {
		if (
			(await redis.get(EXPERIMENT_BUTTONS(guild.id))) === 'check' &&
			!new Permissions(BigInt(data.member.permissions)).has('MANAGE_MESSAGES')
		)
			return;
		messageParts.push(APPROVED(executor.tag));
		e.setColor(COLOR_DARK);
	}

	e.setFooter(LOG_FOOTER_TEXT(executor.tag, executor.id), executor.displayAvatarURL());

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
