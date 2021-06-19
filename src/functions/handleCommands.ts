import { Interaction } from 'discord.js';
import {
	COMMAND_NAME_TEST,
	COMMAND_NAME_CONFIG,
	COMMAND_NAME_ATTRIBUTES,
	COMMAND_NAME_ATTRIBUTES_NYT,
	COMMAND_NAME_WATCH,
} from '../constants';
import { attributes } from './commands/attributes';
import { configCommand } from './commands/config';
import { testCommand } from './commands/test';
import { watchCommand } from './commands/watch';

export function handleCommands(interaction: Interaction) {
	if (!interaction.isCommand()) return;
	const { commandName } = interaction;
	if (commandName === COMMAND_NAME_TEST) {
		void testCommand(interaction);
	}

	if (commandName === COMMAND_NAME_CONFIG) {
		void configCommand(interaction);
	}

	if ([COMMAND_NAME_ATTRIBUTES, COMMAND_NAME_ATTRIBUTES_NYT].includes(commandName)) {
		void attributes(interaction);
	}

	if (commandName === COMMAND_NAME_WATCH) {
		void watchCommand(interaction);
	}
}
