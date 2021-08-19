import { DMChannel, MessageActionRow, MessageButton, Permissions, Client } from 'discord.js';
import i18next from 'i18next';
import { destructureIncidentButtonId } from '../utils';
import { OpCodes } from '..';
import { CID_SEPARATOR } from '../constants';
import { logger } from '../functions/logger';
import { Incident, GuildSettings, IncidentResolvedBy } from '../types/DataTypes';

export async function incidentCheck(client: Client) {
	const { sql, channels } = client;
	const incidents = await sql<Incident[]>`select * from incidents where resolvedby is null`;
	logger.info(`Starting scheduled incident check with ${incidents.length} unresolved incidents`);
	logger.debug({
		msg: 'unresolved incidents',
		iid: incidents.map((i) => i.id),
	});

	for (const incident of incidents) {
		const now = Date.now();
		const logChannel = channels.resolve(incident.logchannel ?? '');

		const [settings] = await sql<[GuildSettings]>`select * from guild_settings where guild = ${incident.guild}`;

		if (!logChannel || !logChannel.isText() || logChannel instanceof DMChannel || !incident.logmessage) {
			logger.debug({
				msg: `incident ${incident.id} resolved (l.18)`,
				noLogC: !logChannel,
				notTextC: !logChannel?.isText(),
				isDMC: logChannel instanceof DMChannel,
				noLogM: !incident.logmessage,
			});
			sql`update incidents set resolvedby = ${IncidentResolvedBy.LOGCHANNEL_INVALID} where id = ${incident.id}`;
			continue;
		}

		try {
			const message = await logChannel.messages.fetch(incident.logmessage);
			const {
				client: { user: clientUser },
			} = message;
			const logEmbed = message.embeds[0];
			if (!logEmbed) {
				sql`update incidents set resolvedby = ${IncidentResolvedBy.NO_LOGEMBED} where id = ${incident.id}`;
				continue;
			}

			const row = new MessageActionRow();
			const linkButton = message.components[0]?.components.find((c) => c.type === 'BUTTON' && c.style === 'LINK');

			if (now >= incident.expiresat) {
				logger.debug({
					msg: `incident ${incident.id} resolved. (l.33)`,
					now,
					expAt: incident.expiresat,
					check: now >= incident.expiresat,
				});

				logEmbed.setFooter(
					i18next.t('tasks.incidentcheck.expired', { lng: settings.locale }),
					clientUser?.displayAvatarURL(),
				);

				if (linkButton) {
					row.addComponents(linkButton);
					await message.edit({
						components: [row],
						embeds: [logEmbed],
					});
				} else {
					await message.edit({
						components: [],
						embeds: [logEmbed],
					});
				}
				await sql`update incidents set resolvedby = ${IncidentResolvedBy.ACTION_EXPIRED} where id = ${incident.id}`;
				continue;
			}

			const { guild } = logChannel;

			const rows = [];
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
								if (canBan) {
									//* can ban, fetch bans
									const banned = await guild.bans.fetch();
									if (banned.has(incident.user)) {
										//* is banned, skip ban button
										continue;
									} else {
										//* is not banned, add button, set forceBan
										newRow.addComponents(
											component
												.setLabel(
													i18next.t('buttons.labels.forceban', {
														lng: settings.locale,
													}),
												)
												.setDisabled(false),
										);
									}
								} else {
									//* cannot ban, set disabled forceban
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
								//* message no longer exists, don't set delete button
								continue;
							}
						} else if (op === OpCodes.REVIEW) {
							const componentsWithoutLink = newRow.components.filter(
								(c) => !(c.type === 'BUTTON' && c.style === 'LINK'),
							).length;
							if (componentsWithoutLink) {
								//* has action button, add review
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
				if (newRow.components.length) {
					rows.push(newRow);
				}
			}
			await message.edit({ components: rows });
		} catch (error) {
			logger.error(error);
			logger.debug({
				msg: `incident ${incident.id} resolved. (l.204)`,
				reason: 'cought error',
			});
			await sql`update incidents set resolvedby = ${IncidentResolvedBy.TASK_ERROR} where id = ${incident.id}`;
		}
	}
}
