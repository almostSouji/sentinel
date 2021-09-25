import { MessageComponentInteraction, MessageActionRow, DMChannel, Guild, Message, MessageButton } from 'discord.js';

import { logger } from '../utils/logger';

import { OpCodes } from '..';
import { CID_SEPARATOR } from '../utils/constants';

export async function handleGuildListRemoveButton(interaction: MessageComponentInteraction, guild: Guild) {
	const {
		client: { sql },
	} = interaction;

	if (!interaction.channel || interaction.channel instanceof DMChannel || interaction.channel.partial) return;

	await sql`delete from guild_list where guild = ${guild.id}`;

	const oldMessage = interaction.message as Message;
	const newRows = [];

	for (const row of oldMessage.components) {
		if (row.components.find((c) => c.customId === interaction.customId)) {
			newRows.push(
				new MessageActionRow().addComponents([
					new MessageButton()
						.setCustomId(`${String(OpCodes.GUILD_LIST_ADD)}${CID_SEPARATOR}${guild.id}`)
						.setLabel('Sentinel is disabled')
						.setStyle('SECONDARY'),
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
