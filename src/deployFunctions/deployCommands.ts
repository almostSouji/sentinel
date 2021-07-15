import { config } from 'dotenv';
import { resolve } from 'path';
import { REST } from '@discordjs/rest';
import { Routes, Snowflake } from 'discord-api-types/v8';

config({ path: resolve(__dirname, '../../.env') });

/* eslint-disable @typescript-eslint/no-unused-vars */
import { AttributesCommand } from '../interactions/attributes';
import { ConfigCommand } from '../interactions/config';
import { CustomTriggerCommand } from '../interactions/customTrigger';
import { NotifyCommand } from '../interactions/notify';
import { NYTAttributesCommand } from '../interactions/nytAttributes';
import { FetchLogCommand } from '../interactions/fetchLog';
import { RedisCommand } from '../interactions/redis';
import { TestCommand } from '../interactions/test';
import { WatchCommand } from '../interactions/watch';
import { KarmaCommand } from '../interactions/karma';
/* eslint-enable @typescript-eslint/no-unused-vars */
import { logger } from '../functions/logger';

const commands = [
	TestCommand,
	KarmaCommand,
	ConfigCommand,
	WatchCommand,
	AttributesCommand,
	NYTAttributesCommand,
	CustomTriggerCommand,
	NotifyCommand,
	FetchLogCommand, // ! devcommand
	RedisCommand, // ! devcommand
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
		logger.info('Sucessfully reloaded interaction (/) commands.');
	} catch (e) {
		logger.error(e);
	}
}

void main();
