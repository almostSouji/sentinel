import { Guild, MessageButton, MessageActionRow, Snowflake, MessageEmbed } from 'discord.js';
import { OpCodes } from '../..';
import { logger } from '../../interactions/logger';

export async function handleMessageDeletableState(
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
): Promise<boolean> {
	const channel = guild.channels.resolve(targetChannel);
	if (!channel || !channel.isText()) {
		row.components = row.components.filter(
			(c) => Buffer.from(c.customId ?? '', 'binary').readUInt16LE() !== OpCodes.DELETE,
		);
		return true;
	}
	try {
		const message = await channel.messages.fetch(targetMessage);
		if (message.deletable === button.disabled) {
			button.setDisabled(!button.disabled);
			return true;
		}
	} catch (error) {
		logger.error(error);
		row.components = row.components.filter(
			(c) => Buffer.from(c.customId ?? '', 'binary').readUInt16LE() !== OpCodes.DELETE,
		);
		return true;
	}

	return false;
}
