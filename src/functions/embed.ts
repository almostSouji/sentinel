import {
	MessageEmbed,
	TextChannel,
	NewsChannel,
	Message,
	PartialMessage,
	MessageActionRow,
	Snowflake,
} from 'discord.js';
import { DEBUG_GUILDS, NOTIF_LEVEL, NOTIF_PREFIX, NOTIF_ROLES, NOTIF_USERS, STRICTNESS } from '../keys';
import { generateButtons, listButton } from './buttons';
import { strictnessPick } from './checkMessage';
import { truncate, truncateEmbed } from './util';

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
	const debug = await redis.sismember(DEBUG_GUILDS, guild.id);
	const botPermissions = targetChannel.permissionsFor(clientUser!);
	const strictness = parseInt((await redis.get(STRICTNESS(guild.id))) ?? '1', 10);
	const buttonLevel = debug ? 0 : strictnessPick(strictness, 1, 2, 3);

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	const roles = (await redis.smembers(NOTIF_ROLES(guild.id))) as Snowflake[];
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	const users = (await redis.smembers(NOTIF_USERS(guild.id))) as Snowflake[];
	const notificationLevel = parseInt((await redis.get(NOTIF_LEVEL(guild.id))) ?? '0', 10);
	const prefix = (await redis.get(NOTIF_PREFIX(guild.id))) ?? '';

	const metaDataParts: string[] = [];

	embed.setDescription(
		truncate(targetContent ? targetContent.replace(/\n+/g, '\n').replace(/\s+/g, ' ') : 'no content', 1_990),
	);
	embed.setAuthor(`${targetUser.tag} (${targetUser.id})`, targetUser.displayAvatarURL());

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
			content: newContent?.length ? newContent : undefined,
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
		content: newContent?.length ? newContent : undefined,
		embeds: [embed],
		allowedMentions: {
			users,
			roles,
		},
		components: [new MessageActionRow().addComponents(listButton(values))],
	});
}
