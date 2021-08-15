import { Guild, MessageButton, MessageActionRow, Snowflake, MessageEmbed } from 'discord.js';
import { OpCodes } from '../..';
import { banButton, banSingleButton } from '../buttons';

export function handleMemberAdd(
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	locale: string,
	target: Snowflake,
	targetChannel?: Snowflake,
	targetMessage?: Snowflake,
	changedUser?: Snowflake,
): boolean {
	if (changedUser === target) {
		const targetMember = guild.members.resolve(target);
		if (!targetMember) return false;
		const banIndex = row.components.findIndex((c) => {
			const op = Buffer.from(c.customId ?? '', 'binary').readUInt16LE();
			return [OpCodes.BAN, OpCodes.BAN_SPAM].includes(op);
		});

		row.components.splice(
			Math.max(banIndex, 0),
			banIndex >= 0 ? 1 : 0,
			targetChannel && targetMessage
				? banButton(target, targetChannel, targetMessage, targetMember.bannable, locale)
				: banSingleButton(target, targetMember.bannable, locale),
		);
		return true;
	}
	return false;
}
