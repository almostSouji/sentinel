import { Guild, MessageButton, MessageActionRow, Snowflake, MessageEmbed } from 'discord.js';
import { BUTTON_ACTION_BAN } from '../../constants';
import { banButton } from '../buttons';

export function handleMemberAdd(
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	target: Snowflake,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	changedUser?: Snowflake,
): boolean {
	if (changedUser === target) {
		const targetMember = guild.members.resolve(target);
		if (!targetMember) return false;
		const banIndex = row.components.findIndex((c) => c.customID?.startsWith(BUTTON_ACTION_BAN));
		row.components.splice(
			Math.max(banIndex, 0),
			banIndex >= 0 ? 1 : 0,
			banButton(target, targetChannel, targetMessage, targetMember.bannable),
		);
		return true;
	}
	return false;
}
