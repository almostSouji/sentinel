import { CommandInteraction } from 'discord.js';
import { NOT_IN_DM } from '../messages/messages';
import { logger } from '../functions/logger';
import { truncate } from '../functions/util';
import { RedisCommand } from '../interactions/redis';
import { ArgumentsOf } from '../types/ArgumentsOf';

export async function handleRedisCommand(interaction: CommandInteraction, args: ArgumentsOf<typeof RedisCommand>) {
	const {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		client: { redis },
		guild,
	} = interaction;
	if (!guild) {
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});
	}
	try {
		const query = args.query;
		const redisArgs = query.split(' ');
		let splitChar = ' ';
		// eslint-disable-next-line no-eval
		let res = await eval(
			`redis['${redisArgs[0].toLowerCase()}'](...[${redisArgs
				.slice(1)
				.map((a) => `'${a}'`)
				.join(',')}])`,
		);
		if (res instanceof Array) {
			res = res.join('\n');
			splitChar = '\n';
		}

		void interaction.reply({
			content: `\`\`\`\n${truncate(`${res as string}`, 1990, splitChar)}\n\`\`\``,
			ephemeral: true,
		});
		logger.debug(res);
	} catch (error) {
		logger.error(error);
		void interaction.reply({
			content: `\`\`\`\n${truncate(error.toString(), 1990, '\n')}\n\`\`\``,
			ephemeral: true,
		});
	}
}
