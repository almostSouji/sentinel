import { MessageButton, CommandInteraction } from 'discord.js';
import { OpCodes } from '../..';
import { EMOJI_ID_CHEVRON_LEFT, EMOJI_ID_CHEVRON_RIGHT, MAX_TRIGGER_COUNT, MAX_TRIGGER_LENGTH } from '../../constants';
import { CUSTOM_FLAGS_PHRASES, CUSTOM_FLAGS_WORDS } from '../../keys';
import {
	CUSTOM_LENGTH,
	CUSTOM_LIMIT,
	CUSTOM_NONE,
	CUSTOM_NOT,
	CUSTOM_REMOVE,
	CUSTOM_SET,
	CUSTOM_SHOW,
	NOT_IN_DM,
} from '../../messages/messages';
import { serializeOpCode, serializePage, zSetZipper } from '../util';
import { levelIdentifier } from './notify';

export async function customTriggerCommand(interaction: CommandInteraction) {
	const messageParts = [];

	const {
		options,
		client: { redis },
		guildID,
		guild,
	} = interaction;

	if (!guildID || !guild) {
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});
	}

	const addOption = options.get('add');
	const removeOption = options.get('remove');
	const phrases = await redis.zrange(CUSTOM_FLAGS_PHRASES(guildID), 0, -1, 'WITHSCORES');
	const words = await redis.zrange(CUSTOM_FLAGS_WORDS(guildID), 0, -1, 'WITHSCORES');
	const buttons = [];

	if (addOption) {
		if (words.length + phrases.length > MAX_TRIGGER_COUNT) {
			messageParts.push(CUSTOM_LIMIT);
		} else {
			const mode = addOption.options!.get('mode')!.value as number;
			const trigger = (addOption.options!.get('trigger')!.value as string).replaceAll('`', '');
			const level = addOption.options!.get('level')!.value as number;

			if (trigger.length > MAX_TRIGGER_LENGTH) {
				return void interaction.reply({
					content: CUSTOM_LENGTH,
					ephemeral: true,
				});
			}

			const key = mode === 1 ? CUSTOM_FLAGS_PHRASES : CUSTOM_FLAGS_WORDS;
			void redis.zadd(key(guildID), level, trigger);
			const levelId = levelIdentifier(level);
			const prefix = mode === 1 ? 'Phrase' : 'Word';
			messageParts.push(CUSTOM_SET(prefix, trigger, levelId));
		}
	} else if (removeOption) {
		const mode = removeOption.options!.get('mode')!.value as number;
		const trigger = (removeOption.options!.get('trigger')!.value as string).replaceAll('`', '');

		const key = mode === 1 ? CUSTOM_FLAGS_PHRASES : CUSTOM_FLAGS_WORDS;
		const res = await redis.zrem(key(guildID), trigger);
		const prefix = mode === 1 ? 'phrase' : 'word';

		if (res) {
			messageParts.push(CUSTOM_REMOVE(prefix, trigger));
		} else {
			messageParts.push(CUSTOM_NOT(prefix, trigger));
		}
	} else if (phrases.length || words.length) {
		const phraseMap = zSetZipper(phrases);
		const wordMap = zSetZipper(words);
		let counter = 0;

		for (const [phrase, level] of phraseMap) {
			if (counter < 10) {
				const levelId = levelIdentifier(level);
				messageParts.push(CUSTOM_SHOW('(p)', phrase, levelId));
				counter++;
			}
		}

		for (const [word, level] of wordMap) {
			if (counter < 10) {
				const levelId = levelIdentifier(level);
				messageParts.push(CUSTOM_SHOW('(w)', word, levelId));
				counter++;
			}
		}

		if (phraseMap.length + wordMap.length > 10) {
			buttons.push(
				new MessageButton({
					style: 2,
					customID: serializeOpCode(OpCodes.NOOP),
					emoji: EMOJI_ID_CHEVRON_LEFT,
					disabled: true,
				}),
			);
			buttons.push(
				new MessageButton({
					style: 2,
					disabled: true,
					customID: serializeOpCode(OpCodes.NOOP),
					label: '0',
				}),
			);
			buttons.push(
				new MessageButton({
					style: 2,
					customID: serializePage(OpCodes.PAGE_TRIGGER, 1),
					emoji: EMOJI_ID_CHEVRON_RIGHT,
				}),
			);
		}
	} else {
		messageParts.push(CUSTOM_NONE);
	}

	void interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
		components: buttons.length ? [buttons] : [],
	});
}
