import { Guild, MessageButton, MessageActionRow, Snowflake, Permissions, MessageEmbed } from 'discord.js';
import i18next from 'i18next';
import { OpCodes } from '../..';
import { logger } from '../../interactions/logger';

export async function handleMemberBanState(
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	target: Snowflake,
	locale: string,
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
		button.setLabel(
			i18next.t('buttons.labels.forceban', {
				lng: locale,
			}),
		);
		button.setDisabled(false);
		return true;
	}
	if (error) {
		logger.error(error);
	}
	return false;
}
