import { CommandInteraction } from 'discord.js';
import { NOT_IN_DM } from '../../messages/messages';
import { logger } from '../logger';
import { truncate } from '../util';

export async function redisCommand(interaction: CommandInteraction) {
	const {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		client: { redis },
		guildID,
	} = interaction;
	if (!guildID) {
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});
	}
	try {
		const query = interaction.options.get('query')!.value as string;
		const args = query.split(' ');
		let splitChar = ' ';
		// eslint-disable-next-line no-eval
		let res = await eval(
			`redis['${args[0].toLowerCase()}'](...[${args
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
