import { CommandInteraction } from 'discord.js';
import { MAX_TRIGGER_COUNT, MAX_TRIGGER_LENGTH } from '../../constants';
import { CUSTOM_FLAGS_PHRASES, CUSTOM_FLAGS_WORDS } from '../../keys';
import {
	CUSTOM_LIMIT,
	CUSTOM_NONE,
	CUSTOM_NOT,
	CUSTOM_REMOVE,
	CUSTOM_SET,
	CUSTOM_SHOW,
	NOT_IN_DM,
} from '../../messages/messages';
import { zSetZipper } from '../util';
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

	if (addOption) {
		if (words.length + phrases.length > MAX_TRIGGER_COUNT) {
			messageParts.push(CUSTOM_LIMIT);
		} else {
			const mode = addOption.options!.get('mode')!.value as number;
			const trigger = (addOption.options!.get('trigger')!.value as string)
				.replaceAll('`', '')
				.substring(0, MAX_TRIGGER_LENGTH);
			const level = addOption.options!.get('level')!.value as number;

			const key = mode === 1 ? CUSTOM_FLAGS_PHRASES : CUSTOM_FLAGS_WORDS;
			void redis.zadd(key(guildID), level, trigger);
			const levelId = levelIdentifier(level);
			const prefix = mode === 1 ? 'Phrase' : 'Word';
			messageParts.push(CUSTOM_SET(prefix, trigger, levelId));
		}
	} else if (removeOption) {
		const mode = removeOption.options!.get('mode')!.value as number;
		const trigger = (removeOption.options!.get('trigger')!.value as string)
			.replaceAll('`', '')
			.replaceAll('`', '')
			.substring(0, MAX_TRIGGER_LENGTH);

		const key = mode === 1 ? CUSTOM_FLAGS_PHRASES : CUSTOM_FLAGS_WORDS;
		const res = await redis.zrem(key(guildID), trigger);
		const prefix = mode === 1 ? 'phrase' : 'word';

		if (res) {
			messageParts.push(CUSTOM_REMOVE(prefix, trigger));
		} else {
			messageParts.push(CUSTOM_NOT(prefix, trigger));
		}
	} else if (phrases.length || phrases.length) {
		const phraseMap = zSetZipper(phrases);
		const wordMap = zSetZipper(words);

		for (const [phrase, level] of phraseMap) {
			const levelId = levelIdentifier(level);
			messageParts.push(CUSTOM_SHOW('(p)', phrase, levelId));
		}

		for (const [word, level] of wordMap) {
			const levelId = levelIdentifier(level);
			messageParts.push(CUSTOM_SHOW('(w)', word, levelId));
		}
	} else {
		messageParts.push(CUSTOM_NONE);
	}

	void interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
