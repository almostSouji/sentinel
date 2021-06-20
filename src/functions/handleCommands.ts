import { Interaction } from 'discord.js';
import {
	COMMAND_NAME_TEST,
	COMMAND_NAME_CONFIG,
	COMMAND_NAME_ATTRIBUTES,
	COMMAND_NAME_ATTRIBUTES_NYT,
	COMMAND_NAME_WATCH,
	COMMAND_NAME_REDIS,
	COMMAND_NAME_NOTIFY,
} from '../constants';
import { INTERACTION_NO_HANDLER } from '../messages/messages';
import { attributes } from './commands/attributes';
import { configCommand } from './commands/config';
import { notifyCommand } from './commands/notify';
import { redisCommand } from './commands/redis';
import { testCommand } from './commands/test';
import { watchCommand } from './commands/watch';

export function handleCommands(interaction: Interaction) {
	if (!interaction.isCommand()) return;
	const { commandName } = interaction;
	if (commandName === COMMAND_NAME_TEST) {
		return testCommand(interaction);
	}

	if (commandName === COMMAND_NAME_CONFIG) {
		return configCommand(interaction);
	}

	if ([COMMAND_NAME_ATTRIBUTES, COMMAND_NAME_ATTRIBUTES_NYT].includes(commandName)) {
		return attributes(interaction);
	}

	if (commandName === COMMAND_NAME_WATCH) {
		return void watchCommand(interaction);
	}

	if (commandName === COMMAND_NAME_REDIS) {
		return void redisCommand(interaction);
	}

	if (commandName === COMMAND_NAME_NOTIFY) {
		return void notifyCommand(interaction);
	}
	void interaction.reply({
		content: INTERACTION_NO_HANDLER(interaction.commandName, interaction.id),
		ephemeral: true,
	});
}
