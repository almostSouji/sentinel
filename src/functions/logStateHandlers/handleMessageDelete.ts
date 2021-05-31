import { Guild, MessageButton, MessageActionRow, Snowflake } from 'discord.js';
import { BUTTON_ACTION_DELETE } from '../../constants';

export function handleMessageDelete(
	guild: Guild,
	button: MessageButton,
	row: MessageActionRow,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	deletedMessages: Snowflake[] = [],
): boolean {
	const channel = guild.channels.resolve(targetChannel);
	if (!channel || !channel.isText()) {
		// -> channel deleted or not text
		// -> remove delete button
		row.components = row.components.filter((c) => c.customID?.startsWith(BUTTON_ACTION_DELETE));
		return true;
	}
	if (deletedMessages.includes(targetMessage)) {
		// -> message deleted
		// -> remove delete button
		row.components = row.components.filter((b) => !b.customID?.startsWith(BUTTON_ACTION_DELETE));
		return true;
	}

	return false;
}
