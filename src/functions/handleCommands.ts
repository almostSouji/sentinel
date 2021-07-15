import { Interaction } from 'discord.js';
import { INTERACTION_NO_HANDLER } from '../messages/messages';
import { transformInteraction } from './commandParsing/transformInteraction';

import { AttributesCommand } from '../interactions/attributes';
import { ConfigCommand } from '../interactions/config';
import { CustomTriggerCommand } from '../interactions/customTrigger';
import { NotifyCommand } from '../interactions/notify';
import { NYTAttributesCommand } from '../interactions/nytAttributes';
import { TestCommand } from '../interactions/test';
import { WatchCommand } from '../interactions/watch';
import { KarmaCommand } from '../interactions/karma';
import { FetchLogCommand } from '../interactions/fetchLog';
import { RedisCommand } from '../interactions/redis';
import { handleAttributesCommand } from '../commands/attributes';
import { handleNYTAttributesCommand } from '../commands/nytAttributes';
import { handleConfigCommand } from '../commands/config';
import { handleCustomTriggerCommand } from '../commands/customTrigger';
import { handleNotifyCommand } from '../commands/notify';
import { handleTestCommand } from '../commands/test';
import { handleWatchCommand } from '../commands/watch';
import { handleKarmaCommand } from '../commands/karma';
import { handleFetchLogCommand } from '../commands/fetchLog';
import { handleRedisCommand } from '../commands/redis';

export function handleCommands(interaction: Interaction) {
	if (!interaction.isCommand()) return;
	const { commandName, options } = interaction;
	const args = [...options.values()];

	switch (commandName) {
		case AttributesCommand.name:
			return handleAttributesCommand(interaction, transformInteraction<typeof AttributesCommand>(args));

		case ConfigCommand.name:
			return handleConfigCommand(interaction, transformInteraction<typeof ConfigCommand>(args));

		case CustomTriggerCommand.name:
			return handleCustomTriggerCommand(interaction, transformInteraction<typeof CustomTriggerCommand>(args));

		case NotifyCommand.name:
			return handleNotifyCommand(interaction, transformInteraction<typeof NotifyCommand>(args));

		case NYTAttributesCommand.name:
			return handleNYTAttributesCommand(interaction, transformInteraction<typeof NYTAttributesCommand>(args));

		case TestCommand.name:
			return handleTestCommand(interaction, transformInteraction<typeof TestCommand>(args));

		case WatchCommand.name:
			return handleWatchCommand(interaction, transformInteraction<typeof WatchCommand>(args));

		case FetchLogCommand.name:
			return handleFetchLogCommand(interaction, transformInteraction<typeof FetchLogCommand>(args));

		case RedisCommand.name:
			return handleRedisCommand(interaction, transformInteraction<typeof RedisCommand>(args));

		case KarmaCommand.name:
			return handleKarmaCommand(interaction, transformInteraction<typeof KarmaCommand>(args));

		default:
			return interaction.reply({
				content: INTERACTION_NO_HANDLER(interaction.commandName, interaction.id),
				ephemeral: true,
			});
	}
}
