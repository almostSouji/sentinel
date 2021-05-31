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
	Collection,
	Snowflake,
} from 'discord.js';

import {
	BUTTON_ACTION_APPROVE,
	BUTTON_ACTION_BAN,
	BUTTON_ACTION_DELETE,
	BUTTON_ACTION_DISMISS,
	BUTTON_LABEL_FORCE_BAN,
	COLOR_DARK,
	ERROR_CODE_MISSING_PERMISSIONS,
	ERROR_CODE_UNKNOWN_MESSAGE,
	ERROR_CODE_UNKNOWN_USER,
} from './constants';
import { banButton, checkAndApplyNotice, deleteButton, dismissButton } from './functions/buttons';
import Client from './structures/Client';
import { CHANNELS_LOG, EXPERIMENT_BUTTONS } from './keys';
import { analyze } from './functions/analyze';
import {
	APPROVED,
	BAN_FAIL_MISSING,
	BAN_FAIL_OTHER,
	BAN_FAIL_UNKNOWN,
	BAN_SUCCESS,
	DELETE_FAIL_OTHER,
	DELETE_FAIL_UNKNOWN,
	DELETE_SUCCESS,
	DISMISSED,
	LOG_FOOTER_TEXT,
	READY_LOG,
} from './messages/messages';
import { logger } from './functions/logger';
import { truncateEmbed } from './functions/util';

export interface ProcessEnv {
	DISCORD_TOKEN: string;
	PERSPECTIVE_TOKE: string;
}

const client = new Client({
	intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS],
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
				checkAndApplyNotice(embed, Permissions.FLAGS.MANAGE_MESSAGES, botPermissionsInButtonTargetChannel);

				if (error.code === ERROR_CODE_MISSING_PERMISSIONS) {
					const perms = botPermissionsInButtonTargetChannel?.has(Permissions.FLAGS.MANAGE_MESSAGES) ?? false;
					messageParts.push(BAN_FAIL_MISSING(executor.tag, target));
					buttons.push(banButton(target, c, m, perms));
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
			if (shouldCheckPermissions && !channel?.permissionsFor(executor)?.has(Permissions.FLAGS.MANAGE_MESSAGES)) return;
			if (channel?.isText()) {
				try {
					await channel.messages.delete(m);
					messageParts.push(DELETE_SUCCESS(executor.tag));
					if (target !== '0') {
						buttons.push(
							banButton(
								target,
								c,
								'0',
								botPermissionsInButtonTargetChannel?.has(Permissions.FLAGS.BAN_MEMBERS) ?? false,
							),
						);
					}
				} catch (error) {
					logger.error(error);
					if (error.code === ERROR_CODE_UNKNOWN_MESSAGE) {
						messageParts.push(DELETE_FAIL_UNKNOWN(executor.tag));
						if (target !== '0') {
							buttons.push(
								banButton(
									target,
									c,
									'0',
									botPermissionsInButtonTargetChannel?.has(Permissions.FLAGS.BAN_MEMBERS) ?? false,
								),
							);
						}
					} else {
						messageParts.push(DELETE_FAIL_OTHER(executor.tag));
						buttons.push(
							banButton(target, c, m, botPermissionsInButtonTargetChannel?.has(Permissions.FLAGS.BAN_MEMBERS) ?? false),
						);
					}
				} finally {
					checkAndApplyNotice(embed, Permissions.FLAGS.BAN_MEMBERS, botPermissionsInButtonTargetChannel);
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
		embeds: [truncateEmbed(embed)],
		components: buttons.length ? [new MessageActionRow().addComponents(buttons)] : [],
	});
});

client.on('messageDeleteBulk', async (m) => {
	const first = m.first();
	if (!first?.guild) return;
	const deletedMessages = m as Collection<Snowflake, Message>;
	const guild = first.guild;
	const logChannel = guild.channels.resolve((await client.redis.get(CHANNELS_LOG(guild.id))) ?? '');
	if (!logChannel || !logChannel.isText()) return;

	for (const message of logChannel.messages.cache.values()) {
		if (message.author.id !== client.user!.id) continue;
		if (!message.embeds.length) continue;
		const embed = message.embeds[0];
		const content = message.content;
		if (!message.components.length) continue;
		let buttons = message.components[0].components;
		let changed = false;
		const deleteButton = buttons.find((b) => b.customID?.startsWith(BUTTON_ACTION_DELETE));

		if (deleteButton) {
			const [, , secondaryTarget] = deleteButton.customID?.split('-') ?? [];
			const [, m] = secondaryTarget.split('/');
			if (deletedMessages.has(m)) {
				buttons = buttons.filter((b) => !b.customID?.startsWith(BUTTON_ACTION_DELETE));
				changed = true;
			}
		}

		if (!changed) continue;
		void message.edit(content.length ? content : null, {
			embed,
			components: buttons.length ? [new MessageActionRow().addComponents(buttons)] : [],
		});
	}
});

client.on('messageDelete', async (deletedMessage) => {
	const { guild } = deletedMessage;
	if (!guild) return;
	const logChannel = guild.channels.resolve((await client.redis.get(CHANNELS_LOG(guild.id))) ?? '');
	if (!logChannel || !logChannel.isText()) return;

	for (const message of logChannel.messages.cache.values()) {
		if (message.author.id !== client.user!.id) continue;
		if (!message.embeds.length) continue;
		const embed = message.embeds[0];
		const content = message.content;
		if (!message.components.length) continue;
		let buttons = message.components[0].components;
		let changed = false;
		const deleteButton = buttons.find((b) => b.customID?.startsWith(BUTTON_ACTION_DELETE));

		if (deleteButton) {
			const [, , secondaryTarget] = deleteButton.customID?.split('-') ?? [];
			const [, m] = secondaryTarget.split('/');
			if (deletedMessage.id === m) {
				buttons = buttons.filter((b) => !b.customID?.startsWith(BUTTON_ACTION_DELETE));
				changed = true;
			}
		}

		if (!changed) continue;
		void message.edit(content.length ? content : null, {
			embed,
			components: buttons.length ? [new MessageActionRow().addComponents(buttons)] : [],
		});
	}
});

client.on('guildBanAdd', async (ban) => {
	const { guild } = ban;
	const logChannel = guild.channels.resolve((await client.redis.get(CHANNELS_LOG(guild.id))) ?? '');
	if (!logChannel || !logChannel.isText()) return;

	for (const message of logChannel.messages.cache.values()) {
		if (message.author.id !== client.user!.id) continue;
		if (!message.embeds.length) continue;
		const embed = message.embeds[0];
		const content = message.content;
		if (!message.components.length) continue;
		let buttons = message.components[0].components;
		let changed = false;
		const banButton = buttons.find((b) => b.customID?.startsWith(BUTTON_ACTION_BAN));

		if (banButton) {
			const [, target] = banButton.customID?.split('-') ?? [];
			if (target === ban.user.id) {
				// ! user banned, remove ban button
				buttons = buttons.filter((b) => !b.customID?.startsWith(BUTTON_ACTION_BAN));
				changed = true;
			}
		}
		if (!changed) continue;
		void message.edit(content.length ? content : null, {
			embed,
			components: buttons.length ? [new MessageActionRow().addComponents(buttons)] : [],
		});
	}
});

client.on('guildMemberRemove', async (member) => {
	const { guild } = member;
	const logChannel = guild.channels.resolve((await client.redis.get(CHANNELS_LOG(guild.id))) ?? '');
	if (!logChannel || !logChannel.isText()) return;

	for (const message of logChannel.messages.cache.values()) {
		if (message.author.id !== client.user!.id) continue;
		if (!message.embeds.length) continue;
		const embed = message.embeds[0];
		const content = message.content;
		if (!message.components.length) continue;
		let buttons = message.components[0].components;
		let changed = false;
		const banButton = buttons.find((b) => b.customID?.startsWith(BUTTON_ACTION_BAN));

		if (banButton) {
			const [, target] = banButton.customID?.split('-') ?? [];
			if (target === member.id) {
				// ! member left, check if banned
				const bans = await guild.bans.fetch();
				if (bans.has(target)) {
					// ! already banned
					// ! remove ban button
					buttons = buttons.filter((b) => !b.customID?.startsWith(BUTTON_ACTION_BAN));
					changed = true;
				} else {
					// ! not banned yet but left
					// ! force ban
					banButton.setLabel(BUTTON_LABEL_FORCE_BAN);
					changed = true;
				}
			}
		}
		if (!changed) continue;
		void message.edit(content.length ? content : null, {
			embed,
			components: buttons.length ? [new MessageActionRow().addComponents(buttons)] : [],
		});
	}
});

client.on('guildMemberUpdate', async (oldMember) => {
	const { guild } = oldMember;
	const logChannel = guild.channels.resolve((await client.redis.get(CHANNELS_LOG(oldMember.guild.id))) ?? '');
	if (!logChannel || !logChannel.isText()) return;

	for (const message of logChannel.messages.cache.values()) {
		if (message.author.id !== client.user!.id) continue;
		if (!message.embeds.length) continue;
		const embed = message.embeds[0];
		const content = message.content;
		if (!message.components.length) continue;
		let buttons = message.components[0].components;
		let changed = false;
		const banButton = buttons.find((b) => b.customID?.startsWith(BUTTON_ACTION_BAN));
		const deleteButton = buttons.find((b) => b.customID?.startsWith(BUTTON_ACTION_DELETE));

		if (banButton) {
			const [, target] = banButton.customID?.split('-') ?? [];
			try {
				const targetMember = await guild.members.fetch(target);
				if (targetMember.bannable === banButton.disabled) {
					// ! ability to ban changed
					// ! invert disabled state
					banButton.setDisabled(!banButton.disabled);
					changed = true;
				}
			} catch (error) {
				logger.error(error);
				const bans = await guild.bans.fetch();
				if (bans.has(target)) {
					// ! already banned
					// ! remove ban button
					buttons = buttons.filter((b) => !b.customID?.startsWith(BUTTON_ACTION_BAN));
					changed = true;
				} else {
					// ! not banned yet but left
					// ! force ban
					banButton.setLabel(BUTTON_LABEL_FORCE_BAN);
					changed = true;
				}
			}
		}

		if (deleteButton) {
			const [, , secondaryTarget] = deleteButton.customID?.split('-') ?? [];
			const [c, m] = secondaryTarget.split('/');
			const channel = guild.channels.resolve(c);
			if (!channel || !channel.isText()) {
				// ! channel has been deleted | is not text
				// ! remove delete button
				buttons = buttons.filter((b) => !b.customID?.startsWith(BUTTON_ACTION_DELETE));
				changed = true;
			} else {
				try {
					const message = await channel.messages.fetch(m);
					if (message.deletable === deleteButton.disabled) {
						deleteButton.setDisabled(!deleteButton.disabled);
						changed = true;
					}
				} catch (error) {
					logger.error(error);
					// ! message deleted
					// ! remove delete button
					buttons = buttons.filter((b) => !b.customID?.startsWith(BUTTON_ACTION_DELETE));
					changed = true;
				}
			}
		}

		if (!changed) continue;
		void message.edit(content.length ? content : null, {
			embed,
			components: buttons.length ? [new MessageActionRow().addComponents(buttons)] : [],
		});
	}
});

void client.login(process.env.DISCORD_TOKEN);
