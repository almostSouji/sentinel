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
	Collection,
	Snowflake,
	Guild,
	MessageFlags,
} from 'discord.js';

import {
	EMOJI_ID_SHIELD_RED_SMALL,
	ERROR_CODE_MISSING_PERMISSIONS,
	ERROR_CODE_UNKNOWN_MESSAGE,
	ERROR_CODE_UNKNOWN_USER,
	LIST_BULLET,
} from './constants';
import Client from './structures/Client';
import { checkMessage } from './functions/checkMessage';
import { logger } from './interactions/logger';
import { deserializeAttributes, deserializeTargets, emojiOrFallback, truncateEmbed } from './utils';
import { updateLogState } from './functions/updateLogState';
import { handleMemberGuildState } from './functions/logStateHandlers/handleMemberGuildState';
import { handleMessageDeletableState } from './functions/logStateHandlers/handleMessageDeletableState';
import { handleMemberRemoval } from './functions/logStateHandlers/handleMemberRemoval';
import { handleMessageDelete } from './functions/logStateHandlers/handleMessageDelete';
import { handleChannelDelete } from './functions/logStateHandlers/handleChannelDelete';
import { handleMemberAdd } from './functions/logStateHandlers/handleMemberAdd';
import { handleCommands } from './functions/handleCommands';
import { formatPerspectiveDetails } from './functions/formatting/formatPerspective';
import { GuildSettings } from './types/DataTypes';
import i18next from 'i18next';
import { replyWithError } from './utils/responses';
import { formatEmoji } from './utils/formatting';

export interface ProcessEnv {
	DISCORD_TOKEN: string;
	PERSPECTIVE_TOKEN: string;
	DISCORD_CLIENT_ID: string;
	DEPLOY_GUILD_ID?: string;
	ESHOST: string;
	ESPORT: string;
}

export enum OpCodes {
	NOOP,
	LIST,
	REVIEW,
	BAN,
	DELETE,
}

async function main() {
	const client = new Client({
		intents: [
			Intents.FLAGS.GUILD_MESSAGES,
			Intents.FLAGS.GUILDS,
			Intents.FLAGS.GUILD_MEMBERS,
			Intents.FLAGS.GUILD_BANS,
		],
	});

	try {
		await client.init();

		client.on('messageCreate', (message) => {
			if (message.author.bot || !message.content.length || message.channel.type !== 'GUILD_TEXT') return;
			void checkMessage(message);
		});

		client.on('messageUpdate', (oldMessage, newMessage) => {
			if (
				oldMessage.content === newMessage.content ||
				newMessage.author?.bot ||
				newMessage.channel.type !== 'GUILD_TEXT'
			)
				return;
			void checkMessage(newMessage, true);
		});

		client.on('ready', async () => {
			for (const guild of client.guilds.cache.values()) {
				const [settings] = await client.sql<GuildSettings[]>`select * from guild_settings where guild = ${guild.id}`;
				if (!settings) continue;
				let amount = settings.prefetch;
				let last: Snowflake | null = null;
				let b = false;

				const channel = guild.channels.resolve(settings.logchannel as Snowflake);
				if (!channel || !channel.isText()) continue;
				if (
					!channel
						.permissionsFor(client.user!)
						?.has([Permissions.FLAGS.READ_MESSAGE_HISTORY, Permissions.FLAGS.VIEW_CHANNEL])
				)
					continue;
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
			logger.info(
				i18next.t('ready.ready_log', {
					user: client.user!.tag,
					id: client.user!.id,
					lng: 'en-US',
				}),
			);
		});

		client.on('interactionCreate', async (interaction) => {
			if (interaction.isCommand() || interaction.isContextMenu()) {
				try {
					await handleCommands(interaction);
				} catch (error) {
					Error.stackTraceLimit = Infinity;
					logger.error(error);
					await replyWithError(interaction, i18next.t('common.errors.during_command'));
				}
			}

			if (!interaction.isMessageComponent()) return;
			if (!(interaction.member instanceof GuildMember)) return;
			const { guild } = interaction;
			const { sql } = client;
			if (!guild) return;
			const [settings] = await sql<GuildSettings[]>`select * from guild_settings where guild = ${guild.id}`;
			if (!settings) return;
			const locale = settings.locale;
			const interactionMessage = interaction.message as Message;

			const interactionEmbed = interactionMessage.embeds[0];
			if (!(interaction.guild instanceof Guild)) return;

			const embed = new MessageEmbed(interactionEmbed);
			const executor = interaction.user;
			const messageParts = [];

			let buttons: MessageButton[] = [
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				...(interactionMessage.components?.[0]?.components.filter((c) => c instanceof MessageButton) ?? []),
			] as MessageButton[];

			if (
				!interactionMessage.flags.has(MessageFlags.FLAGS.EPHEMERAL) &&
				!interactionMessage.components.some((row) => {
					return row.components.some((button) => {
						return button.customId === interaction.customId;
					});
				})
			)
				return;

			const res = Buffer.from(interaction.customId, 'binary');
			const op = res.readInt16LE();

			if (op === OpCodes.BAN) {
				const labelBan = i18next.t('buttons.labels.ban', { lng: locale });
				const labelForceBan = i18next.t('buttons.labels.forceban', { lng: locale });
				const { user: targetUserId } = deserializeTargets(res);

				if (!interaction.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
					return replyWithError(
						interaction,
						i18next.t('buttons.ban_no_permissions', {
							lng: locale,
						}),
					);
				}

				try {
					const user = await interaction.guild.members.ban(targetUserId, {
						days: 1,
						reason: `Button action by ${executor.tag}`,
					});

					messageParts.push(
						`${LIST_BULLET} ${i18next.t('buttons.ban_success', {
							executor: `\`${executor.tag}\``,
							target: `\`${user instanceof GuildMember ? user.user.tag : user instanceof User ? user.tag : user}\``,
							lng: locale,
						})}`,
					);
					buttons = buttons.filter((b) => b.label !== labelBan && b.label !== labelForceBan);
				} catch (error) {
					logger.error(error);

					if (error.code === ERROR_CODE_MISSING_PERMISSIONS) {
						messageParts.push(
							`${LIST_BULLET} ${i18next.t('buttons.ban_missing_permissions', {
								executor: `\`${executor.tag}\``,
								target: `\`${targetUserId}\``,
								lng: locale,
							})}`,
						);

						buttons.find((b) => b.label === labelBan)?.setDisabled(true);
					} else if (error.code === ERROR_CODE_UNKNOWN_USER) {
						messageParts.push(
							`${LIST_BULLET} ${i18next.t('buttons.ban_unknown_user', {
								executor: `\`${executor.tag}\``,
								target: `\`${targetUserId}\``,
								lng: locale,
							})}`,
						);
						buttons = buttons.filter((b) => b.label !== labelBan && b.label !== labelForceBan);
					} else {
						messageParts.push(
							`${LIST_BULLET} ${i18next.t('buttons.ban_unsuccessful', {
								executor: `\`${executor.tag}\``,
								target: `\`${targetUserId}\``,
								lng: locale,
							})}`,
						);
					}
				}
			}

			if (op === OpCodes.DELETE) {
				const labelDelete = i18next.t('buttons.labels.delete', { lng: locale });

				const { channel: targetChannelId, message: targetMessageId } = deserializeTargets(res);
				const channel = interaction.guild.channels.resolve(targetChannelId);
				if (
					!channel?.permissionsFor(executor)?.has([Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.MANAGE_MESSAGES])
				) {
					return replyWithError(
						interaction,
						i18next.t('buttons.delete_no_permissions', {
							lng: locale,
						}),
					);
				}

				if (channel.isText()) {
					try {
						await channel.messages.delete(targetMessageId);
						messageParts.push(
							`${LIST_BULLET} ${i18next.t('buttons.delete_success', {
								executor: `\`${executor.tag}\``,
								lng: locale,
							})}`,
						);
						buttons = buttons.filter((b) => b.label !== labelDelete);
					} catch (error) {
						logger.error(error);

						if (error.code === ERROR_CODE_UNKNOWN_MESSAGE) {
							messageParts.push(
								`${LIST_BULLET} ${i18next.t('buttons.delete_unknown_message', {
									executor: `\`${executor.tag}\``,
									lng: locale,
								})}`,
							);
							buttons = buttons.filter((b) => b.label !== labelDelete);
						} else if (error.code === ERROR_CODE_MISSING_PERMISSIONS) {
							messageParts.push(
								`${LIST_BULLET} ${i18next.t('buttons.delete_missing_permissions', {
									executor: `\`${executor.tag}\``,
									lng: locale,
								})}`,
							);
							buttons = buttons.filter((b) => b.label !== labelDelete);
						} else {
							messageParts.push(
								`${LIST_BULLET} ${i18next.t('buttons.delete_unsuccesful', {
									executor: `\`${executor.tag}\``,
									lng: locale,
								})}`,
							);
						}
					}
				} else {
					messageParts.push(
						`${LIST_BULLET} ${i18next.t('buttons.delete_unknown_channel', {
							executor: `\`${executor.tag}\``,
							lng: locale,
						})}`,
					);
					buttons = buttons.filter((b) => b.label !== labelDelete);
				}
			}

			if (op === OpCodes.REVIEW) {
				const labelList = i18next.t('buttons.labels.list', { lng: locale });
				const { channel: targetChannelId } = deserializeTargets(res);
				const channel = interaction.guild.channels.resolve(targetChannelId);
				if (!channel?.permissionsFor(interaction.member).has(Permissions.FLAGS.MANAGE_MESSAGES))
					return replyWithError(
						interaction,
						i18next.t('buttons.review_no_permissions', {
							lng: locale,
						}),
					);

				messageParts.push(
					`${LIST_BULLET} ${i18next.t('buttons.reviewed', {
						executor: `\`${executor.tag}\``,
						lng: locale,
					})}`,
				);
				buttons = buttons.filter((b) => !b.label || b.label === labelList);
			}

			if (op === OpCodes.LIST) {
				const values = deserializeAttributes(res);
				let response = formatPerspectiveDetails(values, locale);

				if (!response.length) {
					response = `${emojiOrFallback(
						interaction.channel,
						formatEmoji(EMOJI_ID_SHIELD_RED_SMALL),
						LIST_BULLET,
					)} ${i18next.t('checks.format_perspective_no_attributes', { lng: locale })}`;
				}

				return interaction.reply({
					content: response,
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
			void updateLogState(channel.guild, [handleMemberGuildState], [handleMessageDeletableState]);
		});

		client.on('roleUpdate', (oldRole) => {
			void updateLogState(oldRole.guild, [handleMemberGuildState], [handleMessageDeletableState]);
		});

		client.on('messageDeleteBulk', (deletedMessages) => {
			const first = deletedMessages.first();
			if (!first?.guild) return;
			void updateLogState(first.guild, [], [handleMessageDelete], [...deletedMessages.keys()]);
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
	} catch (error) {
		logger.error(error);
	}
}

void main();
