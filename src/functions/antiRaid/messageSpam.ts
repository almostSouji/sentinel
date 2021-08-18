import { COLOR_GREEN, COLOR_ORANGE, COLOR_RED, COLOR_YELLOW, LIST_BULLET, SPAM_EXPIRE_SECONDS } from '../../constants';
import {
	GuildSettings,
	GuildSettingFlags,
	IncidentTypes,
	Notification,
	NotificationTopics,
	IncidentResolvedBy,
} from '../../types/DataTypes';
import { hashString, resolveNotifications, transformHashset, truncateEmbed } from '../../utils';
import { GUILD_HASH_LOGMESSAGE, GUILD_USER_MESSAGE_CHANNEL_COUNT } from '../../utils/keys';
import i18next from 'i18next';
import { channelMention, inlineCode } from '@discordjs/builders';
import { logger } from '../logger';
import { banButton, reviewButton } from '../buttons';
import { ColorResolvable, Message, MessageActionRow, MessageEmbed, ThreadChannel, User } from 'discord.js';

function spamColor(amount: number, threshold: number): ColorResolvable {
	switch (amount) {
		case threshold:
		case threshold + 1:
			return COLOR_GREEN;
		case threshold + 2:
		case threshold + 3:
			return COLOR_YELLOW;
		case threshold + 4:
			return COLOR_ORANGE;
		default:
			return COLOR_RED;
	}
}

function buildEmbed(
	locale: string,
	author: User,
	tripMessage: Message,
	channelSpam: Record<string, number>,
	threshold: number,
	hash: string,
	oldMessage?: Message,
	scamDomains?: string[],
	isBanned = false,
): MessageEmbed {
	const parts = oldMessage?.embeds[0]?.description?.split('\n') ?? [];
	const newParts = [];
	let total = 0;

	for (const [key, value] of Object.entries(channelSpam)) {
		total += value;
		newParts.push(
			i18next.t('spam.messages_in', {
				lng: locale,
				count: value,
				formattedCount: inlineCode(String(value)),
				bullet: LIST_BULLET,
				channel: channelMention(key),
			}),
		);
	}

	parts.push(`${LIST_BULLET} in ${channelMention(tripMessage.channel.id)}`);
	const embed = new MessageEmbed()
		.setColor(spamColor(total, threshold))
		.setAuthor(`${author.tag} (${author.id})`, author.displayAvatarURL())
		.setTitle(i18next.t('spam.spam_detected', { lng: locale }))
		.setDescription(newParts.join('\n'))
		.addFields({
			name: i18next.t('spam.hash_fieldname', { lng: locale }),
			value: inlineCode(hash),
		});

	if (scamDomains?.length) {
		embed.addFields({
			name: i18next.t('spam.scam_found', { lng: locale, count: scamDomains.length }),
			value: scamDomains.map((d) => inlineCode(d)).join('\n'),
		});

		if (isBanned) {
			embed
				.setFooter(i18next.t('spam.scam_found_banned', { lng: locale }), author.client.user!.displayAvatarURL())
				.setTimestamp();
		}
	}

	return embed;
}

export async function messageSpam(message: Message) {
	const {
		client: { redis, sql, listDict },
		guild,
		author,
		content,
		channelId,
	} = message;
	if (!guild || !message.content.length) return;
	const [settings] = await sql<GuildSettings[]>`select * from guild_settings where guild = ${guild.id}`;
	const threshold = settings.spamthreshold;
	if (!settings || !threshold) return;

	const locale = settings.locale;
	const hash = hashString(content);

	const channelSpamKey = GUILD_USER_MESSAGE_CHANNEL_COUNT(guild.id, author.id, hash);
	await redis.hincrby(channelSpamKey, channelId, 1);
	await redis.expire(channelSpamKey, SPAM_EXPIRE_SECONDS);
	const channelSpam = transformHashset(await redis.hgetall(channelSpamKey), (s: string) => parseInt(s, 10));

	const total = Object.values(channelSpam).reduce((a, c) => c + a, 0);

	const logChannel = guild.channels.resolve(settings.logchannel ?? '');
	if (!logChannel || total < threshold || logChannel instanceof ThreadChannel || !logChannel.isText()) return;

	const logkey = GUILD_HASH_LOGMESSAGE(guild.id, author.id, hash);
	const scamDicts = [listDict.get('scamdomains')].filter((e) => e) as string[][];
	const scamDomains = scamDicts.flatMap((words) => words.filter((w) => content.includes(w)));

	const notifications = await sql<Notification[]>`
	select * from notifications where guild = ${guild.id}
`;
	const { roles, users, notificationParts } = resolveNotifications(notifications, -1, [NotificationTopics.SPAM]);

	try {
		const logMessageId = await redis.get(logkey);
		if (!logMessageId) {
			const isBanned = Boolean(
				((settings.flags.includes(GuildSettingFlags.SCAMBAN) && scamDomains.length && message.member?.bannable) ??
					false) &&
					// @ts-ignore
					(await message.member
						.ban({
							reason: i18next.t('spam.scam_ban_reason', { lng: locale }),
							days: 1,
						})
						.catch(() => false)),
			);

			const [{ next_incident_id: incidentId }] = await sql<[{ next_incident_id: number }]>`select next_incident_id()`;

			const logMessage = await logChannel.send({
				embeds: [
					truncateEmbed(
						buildEmbed(locale, author, message, channelSpam, threshold, hash, undefined, scamDomains, isBanned),
					),
				],
				components: isBanned
					? []
					: [
							new MessageActionRow().addComponents(
								banButton(incidentId, message.member?.bannable ?? false, locale),
								reviewButton(incidentId, locale),
							),
					  ],
				content: notificationParts.length ? notificationParts.join(', ') : null,
				allowedMentions: {
					users,
					roles,
				},
			});

			await redis.set(logkey, logMessage.id);
			await redis.expire(logkey, SPAM_EXPIRE_SECONDS);

			await sql`
				insert into incidents (
					id,
					type,
					guild,
					"user",
					logchannel,
					logmessage,
					resolvedby
				) values (
					${incidentId},
					${IncidentTypes.SPAM},
					${guild.id},
					${author.id},
					${logMessage.channelId},
					${logMessage.id},
					${isBanned ? IncidentResolvedBy.AUTO_BAN_SCAM : null}
				)
			`;
			return;
		}
		const logMessage = await logChannel.messages.fetch(logMessageId);
		await logMessage.edit({
			embeds: [
				truncateEmbed(
					buildEmbed(locale, author, message, channelSpam, threshold, hash, logMessage, scamDomains, false),
				),
			],
			content: notificationParts.length ? notificationParts.join(', ') : null,
			allowedMentions: {
				users,
				roles,
			},
		});
		await redis.expire(logkey, SPAM_EXPIRE_SECONDS);

		return;
	} catch (err) {
		logger.error(err);
		void redis.del(logkey);
	}
}
