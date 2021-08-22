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
import { strictnessPick } from './inspection/checkMessage';
import { resolveNotifications, truncate, truncateEmbed } from '../utils';
import { GuildSettings, Notification } from '../types/DataTypes';
import { banButton, deleteButton, linkButton, reviewButton } from './buttons';

export async function sendLog(
	logChannel: TextChannel | NewsChannel | ThreadChannel,
	targetMessage: Message | PartialMessage,
	severityLevel: number,
	embed: MessageEmbed,
	isEdit: boolean,
	nextIncidentId: number,
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
	const botPermissions = targetChannel.permissionsFor(clientUser!);
	const strictness = settings.strictness;
	const buttonLevel = strictnessPick(strictness, 1, 2, 3);

	embed.setDescription(
		truncate(targetContent ? targetContent.replace(/\n+/g, '\n').replace(/\s+/g, ' ') : 'no content', 1_990),
	);
	embed.setAuthor(`${targetUser.tag} (${targetUser.id})`, targetUser.displayAvatarURL());

	const notifications = await sql<Notification[]>`
		select * from notifications where guild = ${guild.id}
	`;

	const { roles, users, notificationParts } = resolveNotifications(notifications, severityLevel);

	const newContent = notificationParts.join(', ');
	const buttons = [
		banButton(nextIncidentId, targetMessage.member?.bannable ?? false, locale),
		deleteButton(
			nextIncidentId,
			botPermissions?.has([Permissions.FLAGS.MANAGE_MESSAGES, Permissions.FLAGS.VIEW_CHANNEL]) ?? false,
			locale,
		),
		reviewButton(nextIncidentId, locale),
		linkButton(targetMessage.url, locale),
	];

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
		components: [new MessageActionRow().addComponents(linkButton(targetMessage.url, locale))],
	});
}
