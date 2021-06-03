import { Guild, MessageButton, MessageActionRow, Snowflake, MessageEmbed } from 'discord.js';
import { BUTTON_ACTION_DELETE } from '../../constants';

export function handleMessageDelete(
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	deletedMessages: Snowflake[] = [],
): boolean {
	const channel = guild.channels.resolve(targetChannel);
	if (!channel || !channel.isText() || deletedMessages.includes(targetMessage)) {
		row.components = row.components.filter((c) => !c.customID?.startsWith(BUTTON_ACTION_DELETE));
		return true;
	}

	return false;
}
