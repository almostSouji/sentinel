import { MessageButton, CommandInteraction, MessageActionRow } from 'discord.js';
import { OpCodes } from '..';
import { EMOJI_ID_CHEVRON_LEFT, EMOJI_ID_CHEVRON_RIGHT, MAX_TRIGGER_COUNT, MAX_TRIGGER_LENGTH } from '../constants';
import { CUSTOM_FLAGS_PHRASES, CUSTOM_FLAGS_WORDS } from '../keys';
import {
	CUSTOM_LENGTH,
	CUSTOM_LIMIT,
	CUSTOM_NONE,
	CUSTOM_NOT,
	CUSTOM_REMOVE,
	CUSTOM_SET,
	CUSTOM_SHOW,
	NOT_IN_DM,
} from '../messages/messages';
import { serializeOpCode, serializePage, zSetZipper } from '../functions/util';
import { levelIdentifier } from './notify';
import { CustomTriggerCommand } from '../interactions/customTrigger';
import { ArgumentsOf } from '../types/ArgumentsOf';

export async function handleCustomTriggerCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof CustomTriggerCommand>,
) {
	const messageParts = [];

	const {
		client: { redis },
		guild,
	} = interaction;

	if (!guild) {
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});
	}

	const phrases = await redis.zrange(CUSTOM_FLAGS_PHRASES(guild.id), 0, -1, 'WITHSCORES');
	const words = await redis.zrange(CUSTOM_FLAGS_WORDS(guild.id), 0, -1, 'WITHSCORES');
	const buttons = [];

	const action = Object.keys(args)[0] as keyof ArgumentsOf<typeof CustomTriggerCommand>;

	switch (action) {
		case 'add':
			if (words.length + phrases.length > MAX_TRIGGER_COUNT) {
				messageParts.push(CUSTOM_LIMIT);
			} else {
				const mode = args.add.mode;
				const trigger = args.add.trigger.replaceAll('`', '');
				const level = args.add.level;

				if (trigger.length > MAX_TRIGGER_LENGTH) {
					return void interaction.reply({
						content: CUSTOM_LENGTH,
						ephemeral: true,
					});
				}

				const key = mode === 1 ? CUSTOM_FLAGS_PHRASES : CUSTOM_FLAGS_WORDS;
				await redis.zadd(key(guild.id), level, trigger);
				const levelId = levelIdentifier(level);
				const prefix = mode === 1 ? 'Phrase' : 'Word';
				messageParts.push(CUSTOM_SET(prefix, trigger, levelId));
			}
			break;
		case 'remove':
			{
				const mode = args.remove.mode;
				const trigger = args.remove.trigger.replaceAll('`', '');

				const key = mode === 1 ? CUSTOM_FLAGS_PHRASES : CUSTOM_FLAGS_WORDS;
				const res = await redis.zrem(key(guild.id), trigger);
				const prefix = mode === 1 ? 'phrase' : 'word';

				if (res) {
					messageParts.push(CUSTOM_REMOVE(prefix, trigger));
				} else {
					messageParts.push(CUSTOM_NOT(prefix, trigger));
				}
			}
			break;
		case 'show':
			if (phrases.length || words.length) {
				const phraseMap = zSetZipper(phrases);
				const wordMap = zSetZipper(words);
				let counter = 0;
				const replacer = /\\(.)/gi;

				for (const [phrase, level] of phraseMap) {
					if (counter < 10) {
						const levelId = levelIdentifier(level);
						messageParts.push(CUSTOM_SHOW('(p)', phrase.replace(replacer, '$1'), levelId));
						counter++;
					}
				}

				for (const [word, level] of wordMap) {
					if (counter < 10) {
						const levelId = levelIdentifier(level);
						messageParts.push(CUSTOM_SHOW('(w)', word.replace(replacer, '$1'), levelId));
						counter++;
					}
				}

				if (phraseMap.length + wordMap.length > 10) {
					buttons.push(
						new MessageButton({
							style: 2,
							customId: serializeOpCode(OpCodes.NOOP),
							emoji: EMOJI_ID_CHEVRON_LEFT,
							disabled: true,
						}),
					);
					buttons.push(
						new MessageButton({
							style: 2,
							disabled: true,
							customId: serializeOpCode(OpCodes.NOOP),
							label: '0',
						}),
					);
					buttons.push(
						new MessageButton({
							style: 2,
							customId: serializePage(OpCodes.PAGE_TRIGGER, 1),
							emoji: EMOJI_ID_CHEVRON_RIGHT,
						}),
					);
				}
			} else {
				messageParts.push(CUSTOM_NONE);
			}
	}

	return interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
		components: buttons.length ? [new MessageActionRow().addComponents(buttons)] : [],
	});
}
