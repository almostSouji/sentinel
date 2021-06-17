import { Guild, MessageButton, MessageActionRow, Snowflake, MessageEmbed } from 'discord.js';
import { OpCodes } from '../..';

export function handleMessageDelete(
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	deletedMessages: Snowflake[] = [],
): boolean {
	const channel = guild.channels.resolve(targetChannel);
	if (!channel || !channel.isText() || deletedMessages.includes(targetMessage)) {
		row.components = row.components.filter(
			(c) => Buffer.from(c.customID ?? '', 'binary').readUInt16LE() !== OpCodes.DELETE,
		);
		return true;
	}

	return false;
}
