/* eslint-disable @typescript-eslint/no-misused-promises */
import {
	MessageEmbed,
	Permissions,
	User,
	GuildMember,
	MessageButton,
	Message,
	MessageActionRow,
	Intents,
	DMChannel,
	TextChannel,
	Collection,
	Snowflake,
	Guild,
} from 'discord.js';

import {
	BUTTON_LABEL_BAN,
	BUTTON_LABEL_DELETE,
	BUTTON_LABEL_FORCE_BAN,
	BUTTON_LABEL_LIST,
	ERROR_CODE_MISSING_PERMISSIONS,
	ERROR_CODE_UNKNOWN_MESSAGE,
	ERROR_CODE_UNKNOWN_USER,
} from './constants';
import Client from './structures/Client';
import { CHANNELS_LOG, EXPERIMENT_BUTTONS, EXPERIMENT_PREFETCH } from './keys';
import { analyze } from './functions/analyze';
import {
	REVIEWED,
	BAN_FAIL_MISSING,
	BAN_FAIL_OTHER,
	BAN_FAIL_UNKNOWN,
	BAN_SUCCESS,
	BUTTON_PRESS_MISSING_PERMISSIONS_BAN,
	BUTTON_PRESS_MISSING_PERMISSIONS_REVIEW,
	BUTTON_PRESS_MISSING_PERMISSIONS_DELETE,
	DELETE_FAIL_OTHER,
	DELETE_FAIL_UNKNOWN,
	DELETE_SUCCESS,
	READY_LOG,
	DELETE_FAIL_CHANNEL,
	DELETE_FAIL_MISSING,
	EXPLAIN_NYT,
} from './messages/messages';
import { logger } from './functions/logger';
import { deserializeAttributes, deserializeTargets, truncateEmbed } from './functions/util';
import { updateLogState } from './functions/updateLogState';
import { handleMemberGuildState } from './functions/logStateHandlers/handleMemberGuildState';
import { handleMessageDeletableState } from './functions/logStateHandlers/handleMessageDeletableState';
import { handleMemberRemoval } from './functions/logStateHandlers/handleMemberRemoval';
import { handleMessageDelete } from './functions/logStateHandlers/handleMessageDelete';
import { handleChannelDelete } from './functions/logStateHandlers/handleChannelDelete';
import { handleMemberAdd } from './functions/logStateHandlers/handleMemberAdd';
import { AttributeScoreMapEntry, nytAttributes } from './functions/perspective';

export interface ProcessEnv {
	DISCORD_TOKEN: string;
	PERSPECTIVE_TOKEN: string;
}

export enum OpCodes {
	LIST = 1,
	REVIEW,
	BAN,
	DELETE,
}

function formatAttributes(values: AttributeScoreMapEntry[]): string {
	const attributes = values
		.sort((a, b) => b.value - a.value)
		.map((val) => `• ${val.value}% \`${val.key}\` ${nytAttributes.includes(val.key) ? '¹' : ''} `)
		.join('\n');
	return `${attributes}${values.some((e) => nytAttributes.includes(e.key)) ? `\n\n${EXPLAIN_NYT}` : ''}`;
}

const client = new Client({
	intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_BANS],
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

client.on('ready', async () => {
	for (const guild of client.guilds.cache.values()) {
		const a = await client.redis.get(EXPERIMENT_PREFETCH(guild.id));
		const c = await client.redis.get(CHANNELS_LOG(guild.id));
		if (!a || !c) continue;
		let amount = parseInt(a, 10);
		let last: Snowflake | null = null;
		let b = false;
		const channel = guild.channels.resolve(c);
		if (isNaN(amount) || !channel || !channel.isText()) continue;
		if (!guild.me?.permissions.has([Permissions.FLAGS.READ_MESSAGE_HISTORY, Permissions.FLAGS.VIEW_CHANNEL])) return;
		while (amount > 0 && !b) {
			const messages: Collection<Snowflake, Message> = await channel.messages.fetch({
				before: last ?? undefined,
				limit: Math.min(amount, 100),
			});

			b = last === messages.last()?.id;
			last = messages.last()?.id ?? null;
			amount -= messages.size;
		}
	}
	logger.info(`${READY_LOG(client.user!.tag)}`);
});

client.on('interaction', async (interaction) => {
	if (!interaction.isMessageComponent()) return;
	const interactionMessage = interaction.message as Message;

	const interactionEmbed = interactionMessage.embeds[0];
	if (!interactionMessage.embeds.length || !(interaction.guild instanceof Guild)) return;

	const embed = new MessageEmbed(interactionEmbed);

	const executor = interaction.user;

	const messageParts = [];
	let buttons: MessageButton[] = [...interactionMessage.components[0]!.components];

	if (
		!interactionMessage.components.some((row) => {
			return row.components.some((button) => {
				return button.customID === interaction.customID;
			});
		})
	)
		return;

	const res = Buffer.from(interaction.customID, 'binary');
	const op = res.readInt16LE();
	const shouldCheckPermissions = await redis.get(EXPERIMENT_BUTTONS(interaction.guild.id));

	if (op === OpCodes.BAN) {
		const { user: targetUserId } = deserializeTargets(res);

		if (shouldCheckPermissions && !interaction.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
			return interaction.reply(BUTTON_PRESS_MISSING_PERMISSIONS_BAN, {
				ephemeral: true,
			});
		}

		try {
			const user = await interaction.guild.members.ban(targetUserId, {
				days: 1,
				reason: `Button action by ${executor.tag}`,
			});

			messageParts.push(
				BAN_SUCCESS(executor.tag, user instanceof GuildMember ? user.user.tag : user instanceof User ? user.tag : user),
			);

			buttons = buttons.filter((b) => b.label !== BUTTON_LABEL_BAN && b.label !== BUTTON_LABEL_FORCE_BAN);
		} catch (error) {
			logger.error(error);

			if (error.code === ERROR_CODE_MISSING_PERMISSIONS) {
				messageParts.push(BAN_FAIL_MISSING(executor.tag, targetUserId));
				buttons.find((b) => b.label === BUTTON_LABEL_BAN)?.setDisabled(true);
			} else if (error.code === ERROR_CODE_UNKNOWN_USER) {
				messageParts.push(BAN_FAIL_UNKNOWN(executor.tag, targetUserId));
				buttons = buttons.filter((b) => b.label !== BUTTON_LABEL_BAN && b.label !== BUTTON_LABEL_FORCE_BAN);
			} else {
				messageParts.push(BAN_FAIL_OTHER(executor.tag, targetUserId));
			}
		}
	}

	if (op === OpCodes.DELETE) {
		const { channel: targetChannelId, message: targetMessageId } = deserializeTargets(res);
		const channel = interaction.guild.channels.resolve(targetChannelId);
		if (
			shouldCheckPermissions &&
			!channel?.permissionsFor(executor)?.has([Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.MANAGE_MESSAGES])
		) {
			return interaction.reply(BUTTON_PRESS_MISSING_PERMISSIONS_DELETE, {
				ephemeral: true,
			});
		}

		if (channel?.isText()) {
			try {
				await channel.messages.delete(targetMessageId);

				messageParts.push(DELETE_SUCCESS(executor.tag));
				buttons = buttons.filter((b) => b.label !== BUTTON_LABEL_DELETE);
			} catch (error) {
				logger.error(error);

				if (error.code === ERROR_CODE_UNKNOWN_MESSAGE) {
					messageParts.push(DELETE_FAIL_UNKNOWN(executor.tag));
					buttons = buttons.filter((b) => b.label !== BUTTON_LABEL_DELETE);
				} else if (error.code === ERROR_CODE_MISSING_PERMISSIONS) {
					messageParts.push(DELETE_FAIL_MISSING(executor.tag));
					buttons = buttons.filter((b) => b.label !== BUTTON_LABEL_DELETE);
				} else {
					messageParts.push(DELETE_FAIL_OTHER(executor.tag));
				}
			}
		} else {
			messageParts.push(DELETE_FAIL_CHANNEL(executor.tag));
			buttons = buttons.filter((b) => b.label !== BUTTON_LABEL_DELETE);
		}
	}

	if (op === OpCodes.REVIEW) {
		const { channel: targetChannelId } = deserializeTargets(res);
		const channel = interaction.guild.channels.resolve(targetChannelId);
		if (shouldCheckPermissions && !channel?.permissionsFor(interaction.member).has(Permissions.FLAGS.MANAGE_MESSAGES))
			return interaction.reply(BUTTON_PRESS_MISSING_PERMISSIONS_REVIEW, {
				ephemeral: true,
			});

		messageParts.push(REVIEWED(executor.tag));
		buttons = buttons.filter((b) => !b.label || b.label === BUTTON_LABEL_LIST);
	}

	if (op === OpCodes.LIST) {
		const values = deserializeAttributes(res);
		return interaction.reply(formatAttributes(values.filter((e) => e.value > 0)), {
			ephemeral: true,
		});
	}

	if (messageParts.length) {
		const actionFieldIndex = embed.fields.findIndex((field: any) => field.name === 'Actions');
		if (actionFieldIndex < 0) {
			embed.addField('Actions', messageParts.join('\n'));
		} else {
			embed.spliceFields(actionFieldIndex, 1, {
				name: 'Actions',
				value: `${embed.fields[actionFieldIndex].value}\n${messageParts.join('\n')}`,
			});
		}
	}

	await interaction.update({
		embeds: [truncateEmbed(embed)],
		components: buttons.length ? [new MessageActionRow().addComponents(buttons)] : [],
	});
});

client.on('messageDelete', (deletedMessage) => {
	const { guild } = deletedMessage;
	if (!guild) return;
	void updateLogState(guild, [], [handleMessageDelete], [deletedMessage.id]);
});

client.on('channelDelete', (channel) => {
	if (channel instanceof DMChannel || !channel.isText()) return;
	void updateLogState(channel.guild, [], [handleChannelDelete], [channel.id]);
});

client.on('channelUpdate', (_, channel) => {
	if (channel instanceof DMChannel || !channel.isText()) return;
	// ? guard should work but doesn't due to upstream #5716
	void updateLogState((channel as TextChannel).guild, [handleMemberGuildState], [handleMessageDeletableState]);
});

client.on('roleUpdate', (oldRole) => {
	void updateLogState(oldRole.guild, [handleMemberGuildState], [handleMessageDeletableState]);
});

client.on('messageDeleteBulk', (deletedMessages) => {
	const first = deletedMessages.first();
	if (!first?.guild) return;
	void updateLogState(first.guild, [], [handleMessageDelete], deletedMessages.keyArray());
});

client.on('guildMemberAdd', (member) => {
	void updateLogState(member.guild, [handleMemberAdd], [], [member.id]);
});

client.on('guildMemberRemove', (member) => {
	void updateLogState(member.guild, [handleMemberRemoval], [], [member.id]);
});

client.on('guildBanAdd', (ban) => {
	void updateLogState(ban.guild, [handleMemberRemoval], [], [ban.user.id], true);
});

client.on('guildMemberUpdate', (oldMember) => {
	const { guild } = oldMember;
	void updateLogState(guild, [handleMemberGuildState], [handleMessageDeletableState]);
});

void client.login(process.env.DISCORD_TOKEN);
