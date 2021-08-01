import { DMChannel, GuildChannel, PartialDMChannel, ThreadChannel } from 'discord.js';
import { emojiOrFallback } from '.';
import {
	PREFIX_NYT,
	PREFIX_NSFW,
	PREFIX_LOCKED,
	EMOJI_ID_SHIELD_RED_SMALL,
	EMOJI_ID_SHIELD_YELLOW_SMALL,
	EMOJI_ID_SHIELD_GREEN_SMALL,
	EMOJI_ID_SHIELD_BLUE_SMALL,
} from '../constants';
import { nytAttributes, nsfwAtrributes, forcedAttributes } from '../functions/perspective';

/**
 * Formats a flag from the limited discord option format flag-format to FLAG_FORMAT
 * @param flag - The Discord option flag
 * @returns The FLAG_FORMAT formatted flag
 */
export function formatFlag(flag: string) {
	return flag.replaceAll('-', '_').toUpperCase();
}

/**
 * Formats a flag for display in responses
 * @param flag  - The flag to format
 * @param verbose - If explaining icons should be added
 * @returnsThe The formatted flag string
 */
export function formatFlagString(flag: string, verbose = false) {
	flag = flag.replaceAll('-', '_').toUpperCase().trim();
	if (!verbose) return `${flag}`;
	const icons = [];
	if (nytAttributes.includes(flag)) icons.push(PREFIX_NYT);
	if (nsfwAtrributes.includes(flag)) icons.push(PREFIX_NSFW);
	if (forcedAttributes.includes(flag)) icons.push(PREFIX_LOCKED);
	return `\`${flag}\` ${icons.join(' ')}`.trim();
}

/**
 * Format a severity identifier string from provided data
 * @param channel - The channel the emoji will be used in
 * @param level - The severity level
 * @returns Formatted severity string
 */
export function formatSeverity(
	channel: GuildChannel | DMChannel | ThreadChannel | PartialDMChannel | null,
	level: number,
): string {
	const word = level === 3 ? 'SEVERE' : level === 2 ? 'HIGH' : level === 1 ? 'LOW' : 'CUSTOM';
	const emoji =
		level === 3
			? emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_RED_SMALL), '🔴')
			: level === 2
			? emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_YELLOW_SMALL), '🟡')
			: level === 1
			? emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_GREEN_SMALL), '🟢')
			: emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_BLUE_SMALL), '🔵');

	return `${word} ${emoji}`;
}

/**
 * Format an Emoji to be used in a Discord message from the provided Emoji Id
 * @param emojiId - The Emoji Id to format
 * @returns The formatted Discord emoji
 */
export function formatEmoji(emojiId: string): string {
	return `<:_:${emojiId}>`;
}

/**
 * Format a channel Id to a discord mention string
 * @param channelId - Channel Id to use
 * @returns The formatted channel mention
 */
export function formatChannelMention(channelId: string): string {
	return `<#${channelId}>`;
}

/**
 * Format a user Id to a discord mention string
 * @param userId - User Id to use
 * @returns The formatted user mention
 */
export function formatUserMention(userId: string): string {
	return `<@${userId}>`;
}

/**
 * Format a role Id to a discord mention string
 * @param userId - Role Id to use
 * @returns The formatted role mention
 */
export function formatRoleMention(userId: string): string {
	return `<@&${userId}>`;
}
