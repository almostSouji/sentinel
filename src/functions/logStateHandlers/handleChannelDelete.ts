import { Guild, MessageButton, MessageActionRow, Snowflake } from 'discord.js';
import { BUTTON_ACTION_DELETE } from '../../constants';

export function handleChannelDelete(
	guild: Guild,
	button: MessageButton,
	row: MessageActionRow,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	deletedStructures: Snowflake[] = [],
): boolean {
	if (deletedStructures.includes(targetChannel)) {
		// -> channel deleted
		// -> remove delete button
		row.components = row.components.filter((b) => !b.customID?.startsWith(BUTTON_ACTION_DELETE));
		return true;
	}

	return false;
}
