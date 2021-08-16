import { DMChannel, MessageActionRow, MessageButton, Permissions, Client } from 'discord.js';
import i18next from 'i18next';
import { destructureIncidentButtonId } from '../utils';
import { OpCodes } from '..';
import { CID_SEPARATOR } from '../constants';
import { logger } from '../functions/logger';
import { Incident, GuildSettings } from '../types/DataTypes';

export async function incidentCheck(client: Client) {
	const { sql, channels } = client;
	logger.info('Starting scheduled incident check');
	const incidents = await sql<Incident[]>`select * from incidents where not expired`;

	for (const incident of incidents) {
		const now = Date.now();
		const logChannel = channels.resolve(incident.logchannel ?? '');

		if (!logChannel || !logChannel.isText() || logChannel instanceof DMChannel || !incident.logmessage) {
			sql`update incidents set expired = true where id = ${incident.id}`;
			continue;
		}

		try {
			const message = await logChannel.messages.fetch(incident.logmessage);

			if (now >= incident.expiresat) {
				sql`update incidents set expired = true where id = ${incident.id}`;
				await message.edit({ components: [] });
				continue;
			}

			const { guild, guildId } = logChannel;
			const [settings] = await sql<GuildSettings[]>`select * from guild_settings where guild = ${guildId}`;
			if (!settings) continue;

			const rows = [];
			if (!message.components.length) {
				sql`update incidents set expired = true where id = ${incident.id}`;
				continue;
			}
			for (const row of message.components) {
				const newRow = new MessageActionRow();
				for (const component of row.components) {
					if (!component.customId) {
						newRow.addComponents(component);
						continue;
					}

					if (component instanceof MessageButton) {
						if (!component.customId.includes(CID_SEPARATOR)) continue;

						const [op] = destructureIncidentButtonId(component.customId);

						if (isNaN(op)) continue;
						if (op === OpCodes.BAN) {
							const canBan = guild.me?.permissions.has(Permissions.FLAGS.BAN_MEMBERS);
							try {
								const member = await guild.members.fetch(incident.user);
								//* member on guild
								if (canBan) {
									//* can ban, fetch bans
									const banned = await guild.bans.fetch();
									if (banned.has(incident.user)) {
										//* is banned
										continue;
									} else {
										//* is not banned
										newRow.addComponents(
											component
												.setLabel(
													i18next.t('buttons.labels.ban', {
														lng: settings.locale,
													}),
												)
												.setDisabled(!member.bannable),
										);
									}
								} else {
									//* can't ban, can't fetch bans
									newRow.addComponents(
										component
											.setLabel(
												i18next.t('buttons.labels.ban', {
													lng: settings.locale,
												}),
											)
											.setDisabled(!canBan),
									);
								}
							} catch {
								//* member not on guild
								newRow.addComponents(
									component
										.setLabel(
											i18next.t('buttons.labels.forceban', {
												lng: settings.locale,
											}),
										)
										.setDisabled(!canBan),
								);
							}
							continue;
						} else if (op === OpCodes.DELETE) {
							const incidentChannel = guild.channels.resolve(incident.channel ?? '');
							if (!incidentChannel || !incidentChannel.isText() || !incident.message) continue;
							const permissionChannel = incidentChannel.isThread() ? incidentChannel.parent : incidentChannel;
							if (!permissionChannel) continue;
							const canDelete = Boolean(
								permissionChannel
									.permissionsFor(client.user!)
									?.has([Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.MANAGE_MESSAGES]),
							);

							try {
								await incidentChannel.messages.fetch(incident.message);
								if (canDelete) {
									//* message exists and can be deleted
									newRow.addComponents(
										component
											.setLabel(
												i18next.t('buttons.labels.delete', {
													lng: settings.locale,
												}),
											)
											.setDisabled(false),
									);
								} else {
									//* message exists and cannot be deleted
									newRow.addComponents(
										component
											.setLabel(
												i18next.t('buttons.labels.delete', {
													lng: settings.locale,
												}),
											)
											.setDisabled(true),
									);
								}
								continue;
							} catch {
								//* message no longer exists
								continue;
							}
						} else if (op === OpCodes.REVIEW) {
							if (newRow.components.length) {
								newRow.addComponents(
									component
										.setLabel(
											i18next.t('buttons.labels.review', {
												lng: settings.locale,
											}),
										)
										.setDisabled(false),
								);
								continue;
							}
						}
					}
				}
				rows.push(newRow);
			}
			await message.edit({ components: rows });
		} catch (error) {
			logger.error(error);
			sql`update incidents set expired = true where id = ${incident.id}`;
		}
	}
}
