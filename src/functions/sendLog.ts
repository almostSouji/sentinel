import {
	MessageEmbed,
	TextChannel,
	NewsChannel,
	Message,
	PartialMessage,
	MessageActionRow,
	Snowflake,
} from 'discord.js';
import { DEBUG_GUILDS_LOGALL, NOTIF_ROLES, NOTIF_USERS, STRICTNESS } from '../keys';
import { generateButtons, listButton } from './buttons';
import { strictnessPick } from './checkMessage';
import { truncate, truncateEmbed, zSetZipper } from './util';

export async function sendLog(
	logChannel: TextChannel | NewsChannel,
	targetMessage: Message | PartialMessage,
	severityLevel: number,
	embed: MessageEmbed,
	isEdit: boolean,
	values: number[],
) {
	if (targetMessage.channel.type === 'dm' || targetMessage.partial) return;
	const {
		client: { redis, user: clientUser },
		channel: targetChannel,
		author: targetUser,
		content: targetContent,
	} = targetMessage;
	const { guild } = targetChannel;
	const logOverride = await redis.sismember(DEBUG_GUILDS_LOGALL, guild.id);
	const botPermissions = targetChannel.permissionsFor(clientUser!);
	const strictness = parseInt((await redis.get(STRICTNESS(guild.id))) ?? '1', 10);
	const buttonLevel = logOverride ? 0 : strictnessPick(strictness, 1, 2, 3);

	const metaDataParts: string[] = [];

	embed.setDescription(
		truncate(targetContent ? targetContent.replace(/\n+/g, '\n').replace(/\s+/g, ' ') : 'no content', 1_990),
	);
	embed.setAuthor(`${targetUser.tag} (${targetUser.id})`, targetUser.displayAvatarURL());

	metaDataParts.push(`• Channel: <#${targetChannel.id}>`);
	metaDataParts.push(`• Message link: [jump ➔](${targetMessage.url})`);

	if (isEdit) {
		metaDataParts.push(`• Message edit`);
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

	const notificationParts = [];
	const roles = [];
	const users = [];

	const notifUsers = await redis.zrange(NOTIF_USERS(guild.id), 0, -1, 'WITHSCORES');
	const notifRoles = await redis.zrange(NOTIF_ROLES(guild.id), 0, -1, 'WITHSCORES');

	if (notifUsers.length || notifRoles.length) {
		const userMap = zSetZipper(notifUsers);
		const roleMap = zSetZipper(notifRoles);

		for (const [id, level] of userMap) {
			if (severityLevel >= level) {
				notificationParts.push(`<@${id}>`);
				users.push(id as Snowflake);
			}
		}

		for (const [id, level] of roleMap) {
			if (severityLevel >= level) {
				notificationParts.push(`<@&${id}>`);
				roles.push(id as Snowflake);
			}
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
	);

	truncateEmbed(embed);
	if (severityLevel >= buttonLevel) {
		void logChannel.send({
			content: newContent.length ? newContent : undefined,
			embeds: [embed],
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
		components: [new MessageActionRow().addComponents(listButton(values))],
	});
}
