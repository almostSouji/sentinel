import { CommandInteraction } from 'discord.js';
import { transformInteraction } from './transformInteraction';
import { AttributesCommand } from '../../interactions/attributes';
import { ConfigCommand } from '../../interactions/config';
import { NotifyCommand } from '../../interactions/notify';
import { NYTAttributesCommand } from '../../interactions/nytAttributes';
import { EvaluateContentCommand } from '../../interactions/evaluateContent';
import { WatchCommand } from '../../interactions/watch';
import { KarmaCommand } from '../../interactions/karma';
import { FetchLogCommand } from '../../interactions/fetchLog';
import { RedisCommand } from '../../interactions/redis';
import { SetPermissionsCommand } from '../../interactions/setPermissions';
import { handleAttributesCommand } from './commands/attributes';
import { handleConfigCommand } from './commands/config';
import { handleNotifyCommand } from './commands/notify';
import { handleTestCommand } from './commands/evaluateContent';
import { handleWatchCommand } from './commands/watch';
import { handleKarmaCommand } from './commands/karma';
import { handleFetchLogCommand } from './commands/fetchLog';
import { handleRedisCommand } from './commands/redis';
import { handleSetPermissionsCommand } from './commands/setPermissions';
import { GuildSettings } from '../../types/DataTypes';
import { replyWithError } from '../../utils/responses';
import i18next from 'i18next';
import { PREFIX_BUG } from '../../utils/constants';
import { EvaluateContentContextCommand } from '../../interactions/evaluateContentContext';
import { KarmaContextCommand } from '../../interactions/karmacontext';
import { SQLCommand } from '../../interactions/sql';
import { handleSQLCommand } from './commands/sql';
import { inlineCode } from '@discordjs/builders';

export async function handleCommands(interaction: CommandInteraction) {
	const { commandName, options } = interaction;
	const args = [...options.data.values()];

	const locale = interaction.guild
		? (
				await interaction.client.sql<
					GuildSettings[]
				>`select * from guild_settings where guild = ${interaction.guild.id}`
		  )[0]?.locale ?? 'en-US'
		: 'en-US';

	switch (commandName) {
		case AttributesCommand.name:
			return handleAttributesCommand(interaction, transformInteraction<typeof AttributesCommand>(args), locale);

		case NYTAttributesCommand.name:
			return handleAttributesCommand(interaction, transformInteraction<typeof NYTAttributesCommand>(args), locale);

		case ConfigCommand.name:
			return handleConfigCommand(interaction, transformInteraction<typeof ConfigCommand>(args), locale);

		case NotifyCommand.name:
			return handleNotifyCommand(interaction, transformInteraction<typeof NotifyCommand>(args), locale);

		case EvaluateContentCommand.name:
		case EvaluateContentContextCommand.name:
			return handleTestCommand(interaction, transformInteraction<typeof EvaluateContentCommand>(args), locale);

		case WatchCommand.name:
			return handleWatchCommand(interaction, transformInteraction<typeof WatchCommand>(args), locale);

		case FetchLogCommand.name:
			return handleFetchLogCommand(interaction, transformInteraction<typeof FetchLogCommand>(args), locale);

		case RedisCommand.name:
			return handleRedisCommand(interaction, transformInteraction<typeof RedisCommand>(args), locale);

		case SQLCommand.name:
			return handleSQLCommand(interaction, transformInteraction<typeof SQLCommand>(args), locale);

		case KarmaCommand.name:
		case KarmaContextCommand.name:
			return handleKarmaCommand(interaction, transformInteraction<typeof KarmaCommand>(args), locale);

		case SetPermissionsCommand.name:
			return handleSetPermissionsCommand(interaction, transformInteraction<typeof SetPermissionsCommand>(args));

		default:
			await replyWithError(
				interaction,
				`${PREFIX_BUG} ${i18next.t('commandexecution.no_handler', {
					command: inlineCode(interaction.commandName),
					id: inlineCode(interaction.id),
					lng: locale,
				})}`,
			);
	}
}
