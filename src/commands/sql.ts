import { CommandInteraction, DMChannel } from 'discord.js';
import { logger } from '../functions/logger';
import { truncate } from '../utils';

import { ArgumentsOf } from '../types/ArgumentsOf';
import i18next from 'i18next';
import { replyWithError } from '../utils/responses';
import { SQLCommand } from '../interactions/sql';
import { inspect } from 'util';
import { codeBlock } from '@discordjs/builders';

export async function handleSQLCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof SQLCommand>,
	locale: string,
) {
	const {
		client: { sql },
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
		const res = await sql.unsafe(args.query);

		void interaction.reply({
			content: codeBlock('js', truncate(`${inspect([...res], { depth: null })}`, 1990, '')),
			ephemeral: true,
		});
		logger.debug(res);
	} catch (error) {
		logger.error(error);
		void interaction.reply({
			content: codeBlock(truncate(error.toString(), 1990, '\n')),
			ephemeral: true,
		});
	}
}
