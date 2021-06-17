import { Interaction } from 'discord.js';
import { COMMAND_NAME_TEST, COMMAND_NAME_CONFIG } from '../constants';
import { configCommand } from './commands/config';
import { testCommand } from './commands/test';

export function handleCommands(interaction: Interaction) {
	if (!interaction.isCommand()) return;
	const { commandName } = interaction;
	if (commandName === COMMAND_NAME_TEST) {
		void testCommand(interaction);
	}

	if (commandName === COMMAND_NAME_CONFIG) {
		void configCommand(interaction);
	}
}
