import { inlineCode } from '@discordjs/builders';
import { Guild, SelectMenuInteraction } from 'discord.js';
import { additionalCommands, defaultCommands } from '../functions/commandHandling/commands/setCommands';
import { LIST_BULLET } from '../utils/constants';
import { logger } from '../utils/logger';

const commands = [...defaultCommands, ...additionalCommands];

export async function handleSetCommandSelect(interaction: SelectMenuInteraction, guild: Guild) {
	try {
		await interaction.deferUpdate();
		const newCommands = [];

		for (const val of interaction.values) {
			const cmd = commands.find((c) => c.name === val);
			if (!cmd) continue;
			newCommands.push({
				...cmd,
				defaultPermission: cmd.default_permission,
			});
		}

		await guild.commands.set(newCommands);
		await interaction.editReply({
			content: `Set commands on guild ${inlineCode(guild.name)} ${inlineCode(guild.id)}:\n${newCommands
				.map((c) => `${LIST_BULLET} ${c.name}`)
				.join('\n')}`,
			components: [],
		});
	} catch (error: any) {
		logger.error(error, error.message);
	}
}
