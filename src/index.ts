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
	Guild,
	MessageFlags,
	TextChannel,
} from 'discord.js';

import {
	CID_SEPARATOR,
	ERROR_CODE_MISSING_PERMISSIONS,
	ERROR_CODE_UNKNOWN_MESSAGE,
	ERROR_CODE_UNKNOWN_USER,
} from './constants';
import Client from './structures/Client';
import { checkMessage } from './functions/checkMessage';
import { logger } from './functions/logger';
import { destructureIncidentButtonId, truncateEmbed } from './utils';
import { handleCommands } from './functions/handleCommands';
import { GuildSettings, Incident, IncidentResolvedBy } from './types/DataTypes';
import i18next from 'i18next';
import { replyWithError } from './utils/responses';
import { messageSpam } from './functions/antiRaid/messageSpam';

export interface ProcessEnv {
	DISCORD_TOKEN: string;
	PERSPECTIVE_TOKEN: string;
	DISCORD_CLIENT_ID: string;
	DEPLOY_GUILD_ID?: string;
	ESHOST: string;
	ESPORT: string;
	SCAM_URL_REMOTE_URL: string;
}

export enum OpCodes {
	NOOP,
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

		client.on('messageCreate', async (message) => {
			try {
				if (message.author.bot || !message.content.length) return;
				await checkMessage(message);
				await messageSpam(message);
			} catch (err) {
				logger.error(err);
			}
		});

		client.on('messageUpdate', async (oldMessage, newMessage) => {
			if (
				oldMessage.content === newMessage.content ||
				newMessage.author?.bot ||
				newMessage.channel.type !== 'GUILD_TEXT'
			)
				return;
			try {
				await checkMessage(newMessage, true);
			} catch (error) {
				logger.error(error);
			}
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

			// handling old buttons without crash
			if (!interaction.customId.includes(CID_SEPARATOR)) {
				return replyWithError(interaction, i18next.t('buttons.no_incident', { lng: locale }));
			}

			const [op, incidentId] = destructureIncidentButtonId(interaction.customId);

			// handling old buttons without crash
			if (Number.isNaN(incidentId)) {
				return replyWithError(interaction, i18next.t('buttons.no_incident', { lng: locale }));
			}

			const [incident] = await sql<Incident[]>`
				select * from incidents where id = ${incidentId}
			`;

			if (!incident) {
				return replyWithError(interaction, i18next.t('buttons.no_incident', { lng: locale }));
			}

			if (incident.resolvedby) {
				return replyWithError(interaction, i18next.t('buttons.incident_resolved', { lng: locale }));
			}

			if (op === OpCodes.BAN) {
				const labelBan = i18next.t('buttons.labels.ban', { lng: locale });
				const targetUserId = incident.user;

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
						reason: i18next.t('buttons.button_action_reason', {
							executor: `${executor.tag} (${executor.id})`,
							lng: locale,
						}),
					});

					embed.setFooter(
						i18next.t('buttons.ban_success', {
							executor: executor.tag,
							target: user instanceof GuildMember ? user.user.tag : user instanceof User ? user.tag : user,
							lng: locale,
						}),
						executor.displayAvatarURL(),
					);

					buttons = [];
				} catch (error) {
					logger.error(error);

					if (error.code === ERROR_CODE_MISSING_PERMISSIONS) {
						embed.setFooter(
							i18next.t('buttons.ban_missing_permissions', {
								executor: executor.tag,
								target: targetUserId,
								lng: locale,
							}),
							executor.displayAvatarURL(),
						);

						buttons.find((b) => b.label === labelBan)?.setDisabled(true);
					} else if (error.code === ERROR_CODE_UNKNOWN_USER) {
						embed.setFooter(
							i18next.t('buttons.ban_unknown_user', {
								executor: executor.tag,
								target: targetUserId,
								lng: locale,
							}),
							executor.displayAvatarURL(),
						);

						buttons = buttons.filter((b) => {
							if (!b.customId) return true;
							const [op] = destructureIncidentButtonId(b.customId);
							return op !== OpCodes.BAN;
						});
					} else {
						embed.setFooter(
							i18next.t('buttons.ban_unsuccessful', {
								executor: executor.tag,
								target: targetUserId,
								lng: locale,
							}),
							executor.displayAvatarURL(),
						);
					}
				}
			}

			if (op === OpCodes.DELETE) {
				const labelDelete = i18next.t('buttons.labels.delete', { lng: locale });

				const targetChannelId = incident.channel!;
				const targetMessageId = incident.message!;
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
						embed.setFooter(
							i18next.t('buttons.delete_success', {
								executor: executor.tag,
								lng: locale,
							}),
							executor.displayAvatarURL(),
						);

						buttons = [];

						logger.debug({
							msg: `incident ${incident.id} resolved. (l.319)`,
							reason: 'delete button',
						});
						await sql`update incidents set resolvedby = ${IncidentResolvedBy.BUTTON_DELETE} where id = ${incidentId}`;
					} catch (error) {
						logger.error(error);

						if (error.code === ERROR_CODE_UNKNOWN_MESSAGE) {
							embed.setFooter(
								i18next.t('buttons.delete_unknown_message', {
									executor: executor.tag,
									lng: locale,
								}),
								executor.displayAvatarURL(),
							);

							buttons = buttons.filter((b) => b.label !== labelDelete);
						} else if (error.code === ERROR_CODE_MISSING_PERMISSIONS) {
							embed.setFooter(
								i18next.t('buttons.delete_missing_permissions', {
									executor: executor.tag,
									lng: locale,
								}),
								executor.displayAvatarURL(),
							);

							buttons = buttons.filter((b) => b.label !== labelDelete);
						} else {
							embed.setFooter(
								i18next.t('buttons.delete_unsuccesful', {
									executor: executor.tag,
									lng: locale,
								}),
								executor.displayAvatarURL(),
							);
						}
					}
				} else {
					embed.setFooter(
						i18next.t('buttons.delete_unknown_channel', {
							executor: executor.tag,
							lng: locale,
						}),
						executor.displayAvatarURL(),
					);

					buttons = buttons.filter((b) => b.label !== labelDelete);
				}
			}

			if (op === OpCodes.REVIEW) {
				if (
					!(interaction.channel as TextChannel)
						.permissionsFor(interaction.member)
						.has(Permissions.FLAGS.MANAGE_MESSAGES)
				)
					return replyWithError(
						interaction,
						i18next.t('buttons.review_no_permissions', {
							lng: locale,
						}),
					);

				embed.setFooter(
					i18next.t('buttons.reviewed', {
						executor: executor.tag,
						lng: locale,
					}),
					executor.displayAvatarURL(),
				);

				buttons = [];

				logger.debug({
					msg: `incident ${incident.id} resolved. (l.319)`,
					reason: 'review button',
				});
				await sql`update incidents set reyolvedby = ${IncidentResolvedBy.BUTTON_REVIEW} where id = ${incidentId}`;
			}

			await interaction.update({
				embeds: [truncateEmbed(embed)],
				components: buttons.length ? [new MessageActionRow().addComponents(buttons)] : [],
			});
		});

		await client.login(process.env.DISCORD_TOKEN);
	} catch (error) {
		logger.error(error);
	}
}

void main();
