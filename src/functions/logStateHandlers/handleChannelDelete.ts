import { Guild, MessageButton, MessageActionRow, Snowflake, MessageEmbed } from 'discord.js';
import { OpCodes } from '../..';

export function handleChannelDelete(
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	deletedStructures: Snowflake[] = [],
): boolean {
	if (deletedStructures.includes(targetChannel)) {
		row.components = row.components.filter(
			(b) => Buffer.from(b.customID ?? '', 'binary').readUInt16LE() !== OpCodes.DELETE,
		);
		return true;
	}

	return false;
}
