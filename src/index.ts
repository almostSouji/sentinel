/* eslint-disable @typescript-eslint/no-misused-promises */
import { MessageEmbed, Permissions, User, GuildMember, MessageButton, Message, MessageActionRow } from 'discord.js';

import {
	BUTTON_ACTION_APPROVE,
	BUTTON_ACTION_BAN,
	BUTTON_ACTION_DELETE,
	BUTTON_ACTION_DISMISS,
	COLOR_DARK,
} from './constants';
import { banButton, checkAndApplyNotice, deleteButton, dismissButton } from './functions/buttons';
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
			if (shouldCheckPermissions && !interaction.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) return;
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
				messageParts.push(BAN_FAIL(executor.tag, target));
				checkAndApplyNotice(embed, Permissions.FLAGS.MANAGE_MESSAGES, botPermissionsInButtonTargetChannel);
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

		if (op === BUTTON_ACTION_DELETE) {
			if (shouldCheckPermissions && !channel?.permissionsFor(executor)?.has(Permissions.FLAGS.MANAGE_MESSAGES)) return;
			if (channel?.isText()) {
				try {
					await channel.messages.delete(m);
					messageParts.push(DELETE_SUCCESS(executor.tag));
				} catch (error) {
					logger.error(error);
					messageParts.push(DELETE_FAIL(executor.tag));
				} finally {
					checkAndApplyNotice(embed, Permissions.FLAGS.BAN_MEMBERS, botPermissionsInButtonTargetChannel);
					buttons.push(
						banButton(target, c, m, botPermissionsInButtonTargetChannel?.has(Permissions.FLAGS.BAN_MEMBERS) ?? false),
					);
				}
			}
		}
	}

	if (buttons.length) {
		buttons.push(dismissButton);
	}

	if (op === BUTTON_ACTION_DISMISS) {
		if (shouldCheckPermissions && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) return;
		messageParts.push(DISMISSED(executor.tag));
	}

	if (op === BUTTON_ACTION_APPROVE) {
		if (shouldCheckPermissions && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) return;
		messageParts.push(APPROVED(executor.tag));
		embed.setColor(COLOR_DARK);
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
		embeds: [embed],
		components: buttons.length ? [new MessageActionRow().addComponents(buttons)] : [],
	});
});

void client.login(process.env.DISCORD_TOKEN);
