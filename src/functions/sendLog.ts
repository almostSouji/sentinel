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
import { resolveNotifications, truncate, truncateEmbed } from '../utils';
import { GuildSettings, Notification } from '../types/DataTypes';
import { feedbackButton, linkButton } from './buttons';
import i18next from 'i18next';
import { channelMention } from '@discordjs/builders';

export async function sendLog(
	logChannel: TextChannel | NewsChannel | ThreadChannel,
	targetMessage: Message | PartialMessage,
	severityLevel: number,
	embed: MessageEmbed,
	isEdit: boolean,
	nextIncidentId: number,
	feedback = false,
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

	embed
		.setDescription(
			truncate(targetContent ? targetContent.replace(/\n+/g, '\n').replace(/\s+/g, ' ') : 'no content', 1_990),
		)
		.setAuthor(`${targetUser.tag} (${targetUser.id})`, targetUser.displayAvatarURL())
		.addField(
			i18next.t('logstate.channel_fieldname', { lng: locale }),
			targetChannel.isThread()
				? i18next.t('logstate.channel_thread', {
						lng: locale,
						channel: channelMention(targetChannel.parentId!),
						thread: channelMention(targetChannel.id),
				  })
				: channelMention(targetChannel.id),
			true,
		);

	const notifications = await sql<Notification[]>`
		select * from notifications where guild = ${guild.id}
	`;

	const { roles, users, notificationParts } = resolveNotifications(notifications, severityLevel);

	const newContent = notificationParts.join(', ');
	const row = new MessageActionRow();

	truncateEmbed(embed);

	if (feedback) {
		row.addComponents(feedbackButton(nextIncidentId));
	}

	row.addComponents(linkButton(targetMessage.url, locale));

	return logChannel.send({
		content: newContent.length ? newContent : undefined,
		embeds: [embed],
		allowedMentions: {
			users,
			roles,
		},
		components: [row],
	});
}
