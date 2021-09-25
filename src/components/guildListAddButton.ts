import { MessageComponentInteraction, MessageActionRow, DMChannel, Guild, Message, MessageButton } from 'discord.js';

import { logger } from '../utils/logger';

import { OpCodes } from '..';
import { CID_SEPARATOR } from '../utils/constants';

export async function handleGuildListAddButton(interaction: MessageComponentInteraction, guild: Guild) {
	const {
		client: { sql },
	} = interaction;

	if (!interaction.channel || interaction.channel instanceof DMChannel || interaction.channel.partial) return;

	await sql`insert into guild_list (guild) values (${guild.id})`;

	const oldMessage = interaction.message as Message;
	const newRows = [];

	for (const row of oldMessage.components) {
		if (row.components.find((c) => c.customId === interaction.customId)) {
			newRows.push(
				new MessageActionRow().addComponents([
					new MessageButton()
						.setCustomId(`${String(OpCodes.GUILD_LIST_REMOVE)}${CID_SEPARATOR}${guild.id}`)
						.setLabel('Sentinel is enabled')
						.setStyle('SUCCESS'),
				]),
			);
		} else {
			newRows.push(row);
		}
	}

	try {
		await interaction.update({
			components: newRows,
		});
	} catch (error: any) {
		logger.error(error, error.message);
	}
}
