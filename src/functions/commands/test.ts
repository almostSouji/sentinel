import { CommandInteraction } from 'discord.js';
import { formatAttributes } from '../..';
import { MAX_MESSAGE_LEN } from '../../constants';
import { CUSTOM_TAG, NOT_IN_DM } from '../../messages/messages';
import { dryCheck } from '../dryCheck';
import { perspectiveAttributes } from '../perspective';
import { truncate } from '../util';

const cb = '```' as const;

export async function testCommand(interaction: CommandInteraction) {
	const { options, client, guildID } = interaction;
	const query = options.get('query');
	const queryValue = query!.value as string;

	if (!guildID)
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});

	const res = await dryCheck(queryValue, client, guildID);
	if (!res) {
		// TODO: support custom tags
		return interaction.reply({
			content: CUSTOM_TAG,
			ephemeral: true,
		});
	}
	const attributes = formatAttributes(
		perspectiveAttributes.map((key, index) => ({
			key,
			value: res[index] / 100,
		})),
	);

	return interaction.reply({
		content: `${cb}\n${truncate(queryValue, MAX_MESSAGE_LEN - attributes.length - 50)}${cb}\n${attributes}`,
		ephemeral: true,
	});
}
