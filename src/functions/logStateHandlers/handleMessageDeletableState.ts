import { Guild, MessageButton, MessageActionRow, Snowflake, MessageEmbed } from 'discord.js';
import { BUTTON_ACTION_DELETE } from '../../constants';
import { logger } from '../logger';

export async function handleMessageDeletableState(
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
): Promise<boolean> {
	const channel = guild.channels.resolve(targetChannel);
	if (!channel || !channel.isText()) {
		row.components = row.components.filter((c) => c.customID?.startsWith(BUTTON_ACTION_DELETE));
		return true;
	}
	try {
		const message = await channel.messages.fetch(targetMessage);
		if (message.deletable === button.disabled) {
			button.setDisabled(!button.disabled);
			return true;
		}
	} catch (error) {
		logger.error(error);
		row.components = row.components.filter((b) => !b.customID?.startsWith(BUTTON_ACTION_DELETE));
		return true;
	}

	return false;
}
