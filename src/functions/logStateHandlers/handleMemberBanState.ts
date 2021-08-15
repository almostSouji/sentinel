import { Guild, MessageButton, MessageActionRow, Snowflake, Permissions, MessageEmbed } from 'discord.js';
import i18next from 'i18next';
import { OpCodes } from '../..';
import { logger } from '../logger';

export async function handleMemberBanState(
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	locale: string,
	target: Snowflake,
	error?: Error,
): Promise<boolean> {
	if (guild.me?.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
		const bans = await guild.bans.fetch();
		if (bans.has(target)) {
			row.components = row.components.filter((c) => {
				const op = Buffer.from(c.customId ?? '', 'binary').readUInt16LE();
				return ![OpCodes.BAN, OpCodes.BAN_SPAM].includes(op);
			});
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
