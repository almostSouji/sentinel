import { Guild, MessageButton, MessageActionRow, Snowflake, MessageEmbed } from 'discord.js';
import { handleMemberBanState } from './handleMemberBanState';

export async function handleMemberGuildState(
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	target: Snowflake,
): Promise<boolean> {
	try {
		const targetMember = await guild.members.fetch(target);
		if (targetMember.bannable === button.disabled) {
			button.setDisabled(!button.disabled);
			return true;
		}
	} catch (error) {
		return handleMemberBanState(guild, embed, button, row, target, error);
	}
	return false;
}
