import {
	MessageEmbed,
	TextChannel,
	NewsChannel,
	Message,
	PartialMessage,
	MessageActionRow,
	Snowflake,
	Permissions,
	ThreadChannel,
} from 'discord.js';
import { generateButtons, listButton } from './buttons';
import { strictnessPick } from './checkMessage';
import { truncate, truncateEmbed } from '../utils';
import { GuildSettings, Notification } from '../types/DataTypes';
import { formatChannelMention, formatRoleMention, formatUserMention } from '../utils/formatting';
import i18next from 'i18next';
import { FLAG_LOG_ALL, LIST_BULLET } from '../constants';

export async function sendLog(
	logChannel: TextChannel | NewsChannel | ThreadChannel,
	targetMessage: Message | PartialMessage,
	severityLevel: number,
	embed: MessageEmbed,
	isEdit: boolean,
	values: number[],
) {
	if (targetMessage.channel.type === 'DM' || targetMessage.partial) return;
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
	if (!hasPerms) return;
	const settings = (await sql<GuildSettings[]>`select * from guild_settings where guild = ${guild.id}`)[0];

	if (!settings) return;
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
		`${LIST_BULLET} ${i18next.t('logstate.info_channel', {
			channel: formatChannelMention(targetChannel.id),
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

	const notificationParts = [];
	const roles: Snowflake[] = [];
	const users: Snowflake[] = [];

	const notifications = await sql<Notification[]>`
		select * from notifications where guild = ${guild.id}
	`;

	for (const notification of notifications) {
		if (severityLevel >= notification.level) {
			notificationParts.push(
				notification.type === 'ROLE' ? formatRoleMention(notification.entity) : formatUserMention(notification.entity),
			);
			(notification.type === 'ROLE' ? roles : users).push(notification.entity);
		}
	}

	const newContent = notificationParts.join(', ');
	const buttons = generateButtons(
		targetMessage.channel.id,
		targetMessage.author.id,
		targetMessage.id,
		values,
		botPermissions,
		targetMessage.member,
		locale,
	);

	truncateEmbed(embed);
	if (severityLevel >= buttonLevel) {
		void logChannel.send({
			content: newContent.length ? newContent : undefined,
			embeds: [truncateEmbed(embed)],
			allowedMentions: {
				users,
				roles,
			},
			components: [new MessageActionRow().addComponents(buttons)],
		});
		return;
	}

	void logChannel.send({
		content: newContent.length ? newContent : undefined,
		embeds: [embed],
		allowedMentions: {
			users,
			roles,
		},
		components: [new MessageActionRow().addComponents(listButton(values, locale))],
	});
}
