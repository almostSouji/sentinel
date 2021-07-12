import { CommandInteraction } from 'discord.js';
import { MAX_MESSAGE_LEN } from '../constants';
import { ArgumentsOf } from '../types/ArgumentsOf';
import { formatCustom } from '../functions/formatting/formatCustom';
import { formatPerspectiveDetails } from '../functions/formatting/formatPerspective';
import { checkContent } from '../functions/inspection/checkContent';
import { truncate } from '../functions/util';
import { TestCommand } from '../interactions/test';
import { NOT_IN_DM } from '../messages/messages';

const cb = '```' as const;

export async function handleTestCommand(interaction: CommandInteraction, args: ArgumentsOf<typeof TestCommand>) {
	const { guild } = interaction;
	const query = args.query;

	if (!guild)
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});

	const { customTrigger, perspective } = await checkContent(query, guild);
	const custom = formatCustom(customTrigger);
	const attributes = formatPerspectiveDetails(
		perspective.tags.map(({ key, score }) => ({
			key,
			value: Math.round(score.value * 10000) / 100,
		})),
	);

	return interaction.reply({
		content: `${cb}${truncate(query, MAX_MESSAGE_LEN - attributes.length - custom.length - 50)}${cb}\n${
			custom.length ? `${custom}\n\n` : ''
		}${attributes}`,
		ephemeral: true,
	});
}
