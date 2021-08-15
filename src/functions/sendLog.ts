import {
	MessageEmbed,
	TextChannel,
	NewsChannel,
	Message,
	PartialMessage,
	MessageActionRow,
	Permissions,
	ThreadChannel,
} from 'discord.js';
import { generateButtons } from './buttons';
import { strictnessPick } from './checkMessage';
import { resolveNotifications, truncate, truncateEmbed } from '../utils';
import { GuildSettings, Notification } from '../types/DataTypes';
import i18next from 'i18next';
import { FLAG_LOG_ALL, LIST_BULLET } from '../constants';
import { channelMention } from '@discordjs/builders';

export async function sendLog(
	logChannel: TextChannel | NewsChannel | ThreadChannel,
	targetMessage: Message | PartialMessage,
	severityLevel: number,
	embed: MessageEmbed,
	isEdit: boolean,
): Promise<Message | false> {
	if (targetMessage.channel.type === 'DM' || targetMessage.partial) return false;
	const {
		client: { sql, user: clientUser },
		channel: targetChannel,
		author: targetUser,
		content: targetContent,
	} = targetMessage;
	const { guild } = targetChannel;

	const hasPerms = logChannel
		.permissionsFor(clientUser!)
		?.has([
			Permissions.FLAGS.VIEW_CHANNEL,
			Permissions.FLAGS.SEND_MESSAGES,
			Permissions.FLAGS.EMBED_LINKS,
			Permissions.FLAGS.READ_MESSAGE_HISTORY,
		]);
	if (!hasPerms) return false;
	const settings = (await sql<GuildSettings[]>`select * from guild_settings where guild = ${guild.id}`)[0];

	if (!settings) return false;
	const locale = settings.locale;
	const logOverride = settings.flags.includes(FLAG_LOG_ALL);
	const botPermissions = targetChannel.permissionsFor(clientUser!);
	const strictness = settings.strictness;
	const buttonLevel = logOverride ? 0 : strictnessPick(strictness, 1, 2, 3);

	const metaDataParts: string[] = [];

	embed.setDescription(
		truncate(targetContent ? targetContent.replace(/\n+/g, '\n').replace(/\s+/g, ' ') : 'no content', 1_990),
	);
	embed.setAuthor(`${targetUser.tag} (${targetUser.id})`, targetUser.displayAvatarURL());

	metaDataParts.push(
		targetChannel instanceof ThreadChannel
			? `${LIST_BULLET} ${i18next.t('logstate.info_channel_thread', {
					channel: channelMention(targetChannel.id),
					parent: targetChannel.parentId ? channelMention(targetChannel.parentId) : 'not found',
					lng: locale,
			  })}`
			: `${LIST_BULLET} ${i18next.t('logstate.info_channel', {
					channel: channelMention(targetChannel.id),
					lng: locale,
			  })}`,
	);

	metaDataParts.push(
		`${LIST_BULLET} ${i18next.t('logstate.info_link', {
			link: targetMessage.url,
			lng: locale,
		})}`,
	);

	if (isEdit) {
		metaDataParts.push(
			`${LIST_BULLET} ${i18next.t('logstate.info_edit', {
				lng: locale,
			})}`,
		);
	}

	const attachments = targetMessage.attachments;
	if (attachments.size) {
		let counter = 1;
		metaDataParts.push(
			`${LIST_BULLET} ${i18next.t('logstate.info_attachments', {
				count: attachments.size,
				links: attachments.map((a) => `[${counter++}](${a.proxyURL})`).join(', '),
				lng: locale,
			})}`,
		);
	}
	if (targetMessage.embeds.length) {
		metaDataParts.push(
			`${LIST_BULLET} ${i18next.t('logstate.info_attachments', {
				count: targetMessage.embeds.length,
				lng: locale,
			})}`,
		);
	}

	embed.addField(
		i18next.t('logstate.info_metadata_fieldname', {
			lng: locale,
		}),
		metaDataParts.join('\n'),
		true,
	);

	const notifications = await sql<Notification[]>`
		select * from notifications where guild = ${guild.id}
	`;

	const { roles, users, notificationParts } = resolveNotifications(notifications, severityLevel);

	const newContent = notificationParts.join(', ');
	const buttons = generateButtons(
		targetChannel instanceof ThreadChannel ? targetChannel.parentId ?? targetChannel.id : targetChannel.id,
		targetMessage.author.id,
		targetMessage.id,
		botPermissions,
		targetMessage.member,
		locale,
	);

	truncateEmbed(embed);
	if (severityLevel >= buttonLevel) {
		return logChannel.send({
			content: newContent.length ? newContent : undefined,
			embeds: [truncateEmbed(embed)],
			allowedMentions: {
				users,
				roles,
			},
			components: [new MessageActionRow().addComponents(buttons)],
		});
	}

	return logChannel.send({
		content: newContent.length ? newContent : undefined,
		embeds: [embed],
		allowedMentions: {
			users,
			roles,
		},
	});
}
