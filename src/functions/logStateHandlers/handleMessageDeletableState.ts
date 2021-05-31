import { Guild, MessageButton, MessageActionRow, Snowflake } from 'discord.js';
import { BUTTON_ACTION_DELETE } from '../../constants';
import { logger } from '../logger';

export async function handleMessageDeletableState(
	guild: Guild,
	button: MessageButton,
	row: MessageActionRow,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
): Promise<boolean> {
	const channel = guild.channels.resolve(targetChannel);
	if (!channel || !channel.isText()) {
		// -> channel deleted or not text
		// -> remove delete button
		row.components = row.components.filter((c) => c.customID?.startsWith(BUTTON_ACTION_DELETE));
		return true;
	}
	try {
		const message = await channel.messages.fetch(targetMessage);
		if (message.deletable === button.disabled) {
			// -> button needs to flip
			button.setDisabled(!button.disabled);
			return true;
		}
	} catch (error) {
		// -> message deleted
		// -> remove delete button
		logger.log(error);
		row.components = row.components.filter((b) => !b.customID?.startsWith(BUTTON_ACTION_DELETE));
		return true;
	}

	return false;
}
