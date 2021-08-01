import { CommandInteraction, DMChannel } from 'discord.js';
import { logger } from '../interactions/logger';
import { truncate } from '../utils';
import { RedisCommand } from '../interactions/redis';
import { ArgumentsOf } from '../types/ArgumentsOf';
import i18next from 'i18next';
import { replyWithError } from '../utils/responses';

export async function handleRedisCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof RedisCommand>,
	locale: string,
) {
	const {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		client: { redis },
		guild,
		channel,
	} = interaction;

	if (!channel || channel.partial) {
		return;
	}

	if (!guild || channel instanceof DMChannel) {
		return replyWithError(interaction, i18next.t('common.errors.not_in_dm', { lng: locale }));
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
