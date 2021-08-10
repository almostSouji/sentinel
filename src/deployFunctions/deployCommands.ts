import { config } from 'dotenv';
import { resolve } from 'path';
import { REST } from '@discordjs/rest';
import { Routes, Snowflake } from 'discord-api-types/v8';

config({ path: resolve(__dirname, '../../.env') });

/* eslint-disable @typescript-eslint/no-unused-vars */
import { AttributesCommand } from '../interactions/attributes';
import { ConfigCommand } from '../interactions/config';
import { NotifyCommand } from '../interactions/notify';
import { NYTAttributesCommand } from '../interactions/nytAttributes';
import { FetchLogCommand } from '../interactions/fetchLog';
import { RedisCommand } from '../interactions/redis';
import { SQLCommand } from '../interactions/sql';
import { EvaluateContentCommand } from '../interactions/evaluateContent';
import { EvaluateContentContextCommand } from '../interactions/evaluateContentContext';
import { WatchCommand } from '../interactions/watch';
import { KarmaCommand } from '../interactions/karma';
import { KarmaContextCommand } from '../interactions/karmacontext';
/* eslint-enable @typescript-eslint/no-unused-vars */
import { logger } from '../functions/logger';

const commands = [
	// ConfigCommand,
	// WatchCommand,
	// AttributesCommand,
	// NYTAttributesCommand,
	// NotifyCommand,
	// EvaluateContentCommand,
	EvaluateContentContextCommand, // 🔧 in-dev feature
	// FetchLogCommand, // ! devcommand
	// RedisCommand, // ! devcommand
	// SQLCommand, // ! devcommand
	// KarmaCommand, // 🔧 in-dev feature
	KarmaContextCommand, // 🔧 in-dev feature
];

async function main() {
	const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN!);

	try {
		logger.info('Start refreshing interaction (/) commands');
		await rest.put(
			// @ts-ignore
			Routes.applicationGuildCommands(
				process.env.DISCORD_CLIENT_ID as Snowflake,
				process.env.DISCORD_GUILD_ID as Snowflake,
			),
			{
				body: commands,
			},
		);
		logger.info('Successfully reloaded interaction (/) commands.');
	} catch (e) {
		logger.error(e);
	}
}

void main();
