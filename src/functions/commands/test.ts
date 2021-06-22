import { CommandInteraction } from 'discord.js';
import { MAX_MESSAGE_LEN } from '../../constants';
import { NOT_IN_DM } from '../../messages/messages';
import { formatCustom } from '../formatting/formatCustom';
import { formatPerspectiveDetails } from '../formatting/formatPerspective';
import { checkContent } from '../inspection/checkContent';
import { truncate } from '../util';

const cb = '```' as const;

export async function testCommand(interaction: CommandInteraction) {
	const { options, guild } = interaction;
	const query = options.get('query');
	const queryValue = query!.value as string;

	if (!guild)
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});

	const { customTrigger, perspective } = await checkContent(queryValue, guild);
	const custom = formatCustom(customTrigger);
	const attributes = formatPerspectiveDetails(
		perspective.tags.map(({ key, score }) => ({
			key,
			value: Math.round(score.value * 10000) / 100,
		})),
	);

	return interaction.reply({
		content: `${cb}${truncate(queryValue, MAX_MESSAGE_LEN - attributes.length - custom.length - 50)}${cb}\n${
			custom.length ? `${custom}\n\n` : ''
		}${attributes}`,
		ephemeral: true,
	});
}
