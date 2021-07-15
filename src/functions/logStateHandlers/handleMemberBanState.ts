import { Guild, MessageButton, MessageActionRow, Snowflake, Permissions, MessageEmbed } from 'discord.js';
import { OpCodes } from '../..';
import { BUTTON_LABEL_FORCE_BAN } from '../../constants';
import { logger } from '../logger';

export async function handleMemberBanState(
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	target: Snowflake,
	error?: Error,
): Promise<boolean> {
	if (guild.me?.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
		const bans = await guild.bans.fetch();
		if (bans.has(target)) {
			row.components = row.components.filter(
				(c) => Buffer.from(c.customId ?? '', 'binary').readUInt16LE() !== OpCodes.BAN,
			);
			return true;
		}
		button.setLabel(BUTTON_LABEL_FORCE_BAN);
		button.setDisabled(false);
		return true;
	}
	if (error) {
		logger.error(error);
	}
	return false;
}
