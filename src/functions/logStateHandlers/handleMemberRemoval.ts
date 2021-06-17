import { Guild, MessageButton, MessageActionRow, Snowflake, MessageEmbed } from 'discord.js';
import { OpCodes } from '../..';
import { handleMemberBanState } from './handleMemberBanState';

export function handleMemberRemoval(
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	target: Snowflake,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	removedUser?: Snowflake,
	isBanned?: boolean,
): Promise<boolean> {
	if (isBanned && removedUser === target) {
		row.components = row.components.filter((c) => {
			const op = Buffer.from(c.customID ?? '', 'binary').readUInt16LE();
			return ![OpCodes.BAN, OpCodes.REVIEW].includes(op);
		});
		return Promise.resolve(true);
	}
	return handleMemberBanState(guild, embed, button, row, target);
}
