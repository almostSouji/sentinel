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
} from 'discord.js';

import {
	BUTTON_ACTION_BAN,
	BUTTON_ACTION_DELETE,
	BUTTON_ACTION_QUESTION,
	BUTTON_ACTION_REVIEW,
	ERROR_CODE_MISSING_PERMISSIONS,
	ERROR_CODE_UNKNOWN_MESSAGE,
	ERROR_CODE_UNKNOWN_USER,
} from './constants';
import { banButton, deleteButton, questionButton } from './functions/buttons';
import Client from './structures/Client';
import { EXPERIMENT_BUTTONS } from './keys';
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
	LOG_FOOTER_TEXT,
	READY_LOG,
	BUTTON_PRESS_EXPLANATION,
} from './messages/messages';
import { logger } from './functions/logger';
import { truncateEmbed } from './functions/util';
import { updateLogState } from './functions/updateLogState';
import { handleMemberGuildState } from './functions/logStateHandlers/handleMemberGuildState';
import { handleMessageDeletableState } from './functions/logStateHandlers/handleMessageDeletableState';
import { handleMemberRemoval } from './functions/logStateHandlers/handleMemberRemoval';
import { handleMessageDelete } from './functions/logStateHandlers/handleMessageDelete';
import { handleChannelDelete } from './functions/logStateHandlers/handleChannelDelete';

export interface ProcessEnv {
	DISCORD_TOKEN: string;
	PERSPECTIVE_TOKE: string;
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

client.on('ready', () => {
	logger.info(`${READY_LOG(client.user!.tag)}`);
});

client.on('interaction', async (interaction) => {
	if (!interaction.isMessageComponent()) return;
	const interactionMessage = interaction.message as Message;

	const interactionEmbed = interactionMessage.embeds[0];
	if (!interactionMessage.embeds.length || !interaction.guild) return;

	const embed = new MessageEmbed(interactionEmbed);

	const executor = interaction.user;

	const messageParts = [];
	const buttons: MessageButton[] = [];

	if (
		!interactionMessage.components.some((row) => {
			return row.components.some((button) => {
				return button.customID === interaction.customID;
			});
		})
	)
		return;

	const [op, target, secondaryTarget] = interaction.customID.split('-');
	const shouldCheckPermissions = await redis.get(EXPERIMENT_BUTTONS(interaction.guild.id));
	if (secondaryTarget) {
		const [c, m] = secondaryTarget.split('/');
		const channel = interaction.guild.channels.resolve(c);
		const botPermissionsInButtonTargetChannel = channel?.permissionsFor(client.user!) ?? null;
		if (op === BUTTON_ACTION_BAN) {
			if (shouldCheckPermissions && !interaction.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS))
				return interaction.reply(BUTTON_PRESS_MISSING_PERMISSIONS_BAN, {
					ephemeral: true,
				});
			try {
				const user = await interaction.guild.members.ban(target, {
					days: 1,
					reason: `Button action by ${executor.tag}`,
				});
				messageParts.push(
					BAN_SUCCESS(
						executor.tag,
						user instanceof GuildMember ? user.user.tag : user instanceof User ? user.tag : user,
					),
				);
			} catch (error) {
				logger.error(error);
				if (error.code === ERROR_CODE_MISSING_PERMISSIONS) {
					const perms = botPermissionsInButtonTargetChannel?.has(Permissions.FLAGS.MANAGE_MESSAGES) ?? false;
					messageParts.push(BAN_FAIL_MISSING(executor.tag, target));
					buttons.push(banButton(target, c, m, interactionMessage.member?.bannable ?? true));
					if (m !== '0' && c !== '0') {
						buttons.push(deleteButton(target, c, m, perms));
					}
				} else if (error.code === ERROR_CODE_UNKNOWN_USER) {
					messageParts.push(BAN_FAIL_UNKNOWN(executor.tag, target));
					if (m !== '0' && c !== '0') {
						buttons.push(
							deleteButton(
								'0',
								c,
								m,
								botPermissionsInButtonTargetChannel?.has(Permissions.FLAGS.MANAGE_MESSAGES) ?? false,
							),
						);
					}
				} else {
					messageParts.push(BAN_FAIL_OTHER(executor.tag, target));
					if (m !== '0' && c !== '0') {
						buttons.push(
							deleteButton(
								target,
								c,
								m,
								botPermissionsInButtonTargetChannel?.has(Permissions.FLAGS.MANAGE_MESSAGES) ?? false,
							),
						);
					}
				}
			}
		}

		if (op === BUTTON_ACTION_DELETE) {
			if (shouldCheckPermissions && !channel?.permissionsFor(executor)?.has(Permissions.FLAGS.MANAGE_MESSAGES))
				return interaction.reply(BUTTON_PRESS_MISSING_PERMISSIONS_DELETE, {
					ephemeral: true,
				});
			if (channel?.isText()) {
				try {
					await channel.messages.delete(m);
					messageParts.push(DELETE_SUCCESS(executor.tag));
					if (target !== '0') {
						buttons.push(banButton(target, c, '0', interactionMessage.member?.bannable ?? true));
					}
				} catch (error) {
					logger.error(error);
					if (error.code === ERROR_CODE_UNKNOWN_MESSAGE) {
						messageParts.push(DELETE_FAIL_UNKNOWN(executor.tag));
						if (target !== '0') {
							buttons.push(banButton(target, c, '0', interactionMessage.member?.bannable ?? true));
						}
					} else {
						messageParts.push(DELETE_FAIL_OTHER(executor.tag));
						buttons.push(banButton(target, c, m, interactionMessage.member?.bannable ?? true));
					}
				}
			}
		}
	}

	if (buttons.length) {
		buttons.push(questionButton);
	}

	if (op === BUTTON_ACTION_REVIEW) {
		if (shouldCheckPermissions && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES))
			return interaction.reply(BUTTON_PRESS_MISSING_PERMISSIONS_REVIEW, {
				ephemeral: true,
			});
		messageParts.push(REVIEWED(executor.tag));
	}

	if (op === BUTTON_ACTION_QUESTION) {
		return interaction.reply(BUTTON_PRESS_EXPLANATION, {
			ephemeral: true,
		});
	}

	embed.setFooter(LOG_FOOTER_TEXT(executor.tag, executor.id), executor.displayAvatarURL());

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

client.on('messageDeleteBulk', (deletedMessages) => {
	const first = deletedMessages.first();
	if (!first?.guild) return;
	void updateLogState(first.guild, [], [handleMessageDelete], deletedMessages.keyArray());
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
