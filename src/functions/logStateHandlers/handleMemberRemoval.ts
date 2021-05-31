import { Guild, MessageButton, MessageActionRow, Snowflake } from 'discord.js';
import { BUTTON_ACTION_BAN } from '../../constants';
import { handleMemberBanState } from './handleMemberBanState';

export function handleMemberRemoval(
	guild: Guild,
	button: MessageButton,
	row: MessageActionRow,
	target: Snowflake,
	removedUser?: Snowflake,
	isBanned?: boolean,
): Promise<boolean> {
	if (isBanned && removedUser === target) {
		// -> already banned
		// -> remove ban button
		row.components = row.components.filter((c) => c.customID?.startsWith(BUTTON_ACTION_BAN));
		return Promise.resolve(true);
	}
	return handleMemberBanState(guild, button, row, target);
}
