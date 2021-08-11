import { ButtonInteraction, CommandInteraction, MessageComponentInteraction, SelectMenuInteraction } from 'discord.js';
import { emojiOrFallback } from '.';
import { EMOJI_ID_SHIELD_RED_SMALL, PREFIX_ERROR } from '../constants';
import { formatEmoji } from '@discordjs/builders';

export type ReplyableInteraction =
	| CommandInteraction
	| ButtonInteraction
	| MessageComponentInteraction
	| SelectMenuInteraction;

/**
 * Reply to an interaction with an ephemeral error message
 * @param interaction - Interaction to reply to
 * @param content - Content to reply with
 * @returns Interaction reply value
 */
export function replyWithError(interaction: ReplyableInteraction, content: string) {
	const prefix = emojiOrFallback(interaction.channel, formatEmoji(EMOJI_ID_SHIELD_RED_SMALL), PREFIX_ERROR);
	return interaction.reply({ content: `${prefix} ${content}`, ephemeral: true });
}
