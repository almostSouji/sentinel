import { Guild, MessageButton, MessageActionRow, Snowflake, Permissions } from 'discord.js';
import { BUTTON_ACTION_BAN, BUTTON_LABEL_FORCE_BAN } from '../../constants';
import { logger } from '../logger';

export async function handleMemberBanState(
	guild: Guild,
	button: MessageButton,
	row: MessageActionRow,
	target: Snowflake,
	error?: Error,
): Promise<boolean> {
	if (guild.me?.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
		const bans = await guild.bans.fetch();
		if (bans.has(target)) {
			// -> not on guild, already banned
			// -> remove ban button
			row.components = row.components.filter((c) => c.customID?.startsWith(BUTTON_ACTION_BAN));
			return true;
		}
		// -> not on guild, not banned
		// -> change to force ban
		button.setLabel(BUTTON_LABEL_FORCE_BAN);
		return true;
	}
	// -> no perms to fetch ban, but something happened
	if (error) {
		logger.error(error);
	}
	return false;
}
