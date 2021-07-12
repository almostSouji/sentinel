import { Client, Snowflake } from 'discord.js';
import { config } from 'dotenv';
import { resolve } from 'path';

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
import { logger } from '../functions/logger';
/* eslint-enable @typescript-eslint/no-unused-vars */

const data = [
	AttributesCommand,
	ConfigCommand,
	CustomTriggerCommand,
	// FetchLogCommand, // ! devcommand
	NotifyCommand,
	NYTAttributesCommand,
	// RedisCommand, // ! devcommand
	TestCommand,
	WatchCommand,
];

const client = new Client({ intents: ['GUILDS'] });

client.on('ready', async () => {
	logger.info('Command deployment starting...');

	const g = client.guilds.resolve(process.env.DEPLOY_GUILD_ID as Snowflake);
	if (!g) {
		logger.info('Could not find dev guild!');
		client.destroy();
		logger.info('Client destroyed.');
		process.exit(0);
	}

	// @ts-ignore
	await g.commands.set(data);

	logger.info('Command deployment done...');
	client.destroy();
	logger.info('Client destroyed.');
	process.exit(0);
});

void client.login(process.env.DISCORD_TOKEN);
