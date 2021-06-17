import { Interaction } from 'discord.js';
import { COMMAND_NAME_TEST } from '../constants';
import { testCommand } from './commands/test';

export function handleCommands(interaction: Interaction) {
	if (!interaction.isCommand()) return;
	const { commandName } = interaction;
	if (commandName === COMMAND_NAME_TEST) {
		void testCommand(interaction);
	}
}
