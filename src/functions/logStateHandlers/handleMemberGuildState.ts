import { Guild, MessageButton, MessageActionRow, Snowflake } from 'discord.js';
import { logger } from '../logger';
import { handleMemberBanState } from './handleMemberBanState';

export async function handleMemberGuildState(
	guild: Guild,
	button: MessageButton,
	row: MessageActionRow,
	target: Snowflake,
): Promise<boolean> {
	try {
		const targetMember = await guild.members.fetch(target);
		logger.debug({
			ban: targetMember.bannable,
			disabled: button.disabled,
		});
		if (targetMember.bannable === button.disabled) {
			// -> ability to ban changed
			// -> invert disable status on ban button
			button.setDisabled(!button.disabled);
			return true;
		}
	} catch (error) {
		return handleMemberBanState(guild, button, row, target, error);
	}
	return false;
}
