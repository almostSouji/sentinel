import { MessageEmbed, TextChannel, NewsChannel, Message, PartialMessage } from 'discord.js';
import { EXPERIMENT_BUTTONS_LEVEL, NOTIF_LEVEL, NOTIF_PREFIX, NOTIF_ROLES, NOTIF_USERS } from '../keys';
import { truncate } from './util';
import { sendWithButtons } from './buttons';

export async function sendLog(
	logChannel: TextChannel | NewsChannel,
	targetMessage: Message | PartialMessage,
	severityLevel: number,
	embed: MessageEmbed,
	isEdit: boolean,
) {
	if (targetMessage.channel.type === 'dm') return;
	const {
		client: { redis, user: clientUser },
		client,
		channel: targetChannel,
		author: targetUser,
		content: targetContent,
	} = targetMessage;
	const { guild } = targetChannel;
	const botPermissions = targetChannel.permissionsFor(clientUser!);
	const buttonLevelString = await redis.get(EXPERIMENT_BUTTONS_LEVEL(guild.id));
	const buttonLevel = parseInt(buttonLevelString ?? '0', 10);

	const roles = await redis.smembers(NOTIF_ROLES(guild.id));
	const users = await redis.smembers(NOTIF_USERS(guild.id));
	const notificationLevel = parseInt((await redis.get(NOTIF_LEVEL(guild.id))) ?? '0', 10);
	const prefix = (await redis.get(NOTIF_PREFIX(guild.id))) ?? '';

	const metaDataParts: string[] = [];

	embed.setDescription(
		truncate(targetContent ? targetContent.replace(/\n+/g, '\n').replace(/\s+/g, ' ') : 'no content', 1_990),
	);
	embed.setAuthor(targetUser ? `${targetUser.tag} (${targetUser.id})` : 'Anonymous', targetUser?.displayAvatarURL());

	metaDataParts.push(`• Channel: <#${targetChannel.id}>`);
	metaDataParts.push(`• Message link: [jump ➔](${targetMessage.url})`);

	if (isEdit) {
		metaDataParts.push(`• Caused by message edit`);
	}

	const attachments = targetMessage.attachments;
	if (attachments.size) {
		let counter = 1;
		metaDataParts.push(
			`• Attachments (${attachments.size}): ${attachments.map((a) => `[${counter++}](${a.proxyURL})`).join(', ')}`,
		);
	}
	if (targetMessage.embeds.length) {
		metaDataParts.push(`• Embeds: ${targetMessage.embeds.length}`);
	}

	embed.addField('Metadata', metaDataParts.join('\n'), true);

	const notificationParts = [...roles.map((role) => `<@&${role}>`), ...users.map((user) => `<@${user}>`)];
	const newContent = severityLevel >= notificationLevel ? `${prefix}${notificationParts.join(', ')}` : null;
	if (buttonLevelString && severityLevel >= buttonLevel) {
		sendWithButtons(
			client,
			logChannel.id,
			targetChannel.id,
			embed,
			targetUser?.id ?? 'invalid user',
			targetMessage.id,
			newContent,
			botPermissions,
			{
				users,
				roles,
			},
		);
	} else {
		void logChannel.send(newContent, {
			embed,
			allowedMentions: {
				users,
				roles,
			},
		});
	}
}
