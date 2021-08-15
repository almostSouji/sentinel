import { roleMention, userMention } from '@discordjs/builders';
import { createHash } from 'crypto';
import { Snowflake, MessageEmbed, DMChannel, GuildChannel, ThreadChannel, PartialDMChannel } from 'discord.js';
import { Notification } from '../types/DataTypes';

/**
 * Return a custom emoji or fallback string based on the everyone permissions in the provided channel
 * @param channel - The channel the permissions should be checked in
 * @param emoji - The custom emoji to return
 * @param fallback - The fallback string to return
 * @returns Custom emoji or fallback string
 */
export function emojiOrFallback(
	channel: GuildChannel | DMChannel | ThreadChannel | PartialDMChannel | null,
	emoji: string,
	fallback: string,
) {
	if (channel instanceof DMChannel || !channel || channel.partial) return emoji;
	// ! can not determine permissions in threads because the parent is not sent with slash commands
	if (channel instanceof ThreadChannel) return emoji;
	return channel.permissionsFor(channel.guild.roles.everyone).has('USE_EXTERNAL_EMOJIS') ? emoji : fallback;
}

/**
 * Truncate a text to a provided length using a provided splitcharacter
 * @param text - Text to truncate
 * @param len - Length to truncate to
 * @param splitChar - Split character to use
 * @returns The truncated text
 */
export function truncate(text: string, len: number, splitChar = ' '): string {
	if (text.length <= len) return text;
	const words = text.split(splitChar);
	const res: string[] = [];
	for (const word of words) {
		const full = res.join(splitChar);
		if (full.length + word.length + 1 <= len - 3) {
			res.push(word);
		}
	}

	const resText = res.join(splitChar);
	return resText.length === text.length ? resText : `${resText.trim()}...`;
}

const LIMIT_EMBED_DESCRIPTION = 4048 as const;
const LIMIT_EMBED_TITLE = 256 as const;
const LIMIT_EMBED_FIELDS = 25 as const;
const LIMIT_EMBED_FIELD_NAME = 256 as const;
const LIMIT_EMBED_FIELD_VALUE = 1024 as const;
const LIMIT_EMBED_AUTHOR_NAME = 256 as const;
const LIMIT_EMBED_FOOTER_TEXT = 2048 as const;

/**
 * Truncate the provided embed
 * @param embed - The embed to truncate
 * @returns The truncated embed
 */
export function truncateEmbed(embed: MessageEmbed): MessageEmbed {
	if (embed.description && embed.description.length > LIMIT_EMBED_DESCRIPTION) {
		embed.description = truncate(embed.description, LIMIT_EMBED_DESCRIPTION);
	}
	if (embed.title && embed.title.length > LIMIT_EMBED_TITLE) {
		embed.title = truncate(embed.title, LIMIT_EMBED_TITLE);
	}
	if (embed.fields.length > LIMIT_EMBED_FIELDS) {
		embed.fields = embed.fields.slice(0, LIMIT_EMBED_FIELDS);
	}
	if (embed.author?.name) {
		embed.author.name = truncate(embed.author.name, LIMIT_EMBED_AUTHOR_NAME);
	}
	if (embed.footer?.text) {
		embed.footer.text = truncate(embed.footer.text, LIMIT_EMBED_FOOTER_TEXT);
	}
	for (const field of embed.fields) {
		field.name = truncate(field.name, LIMIT_EMBED_FIELD_NAME);
		field.value = truncate(field.value, LIMIT_EMBED_FIELD_VALUE);
	}
	return embed;
}

/**
 * Escape a string from regular expression special characters
 * @param str The string to escape
 * @returns The escaped string
 */
export function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Encode provided targets into a binary string
 * @param op - The OP-Code to use
 * @param user - The target user id
 * @param channel - The target channel id
 * @param message - The target message id
 * @returns Encoded binary
 */
export function serializeTargets(op: number, user: Snowflake, channel: Snowflake, message: Snowflake): string {
	const b = Buffer.alloc(2 + 24);
	b.writeUInt16LE(op);
	b.writeBigUInt64LE(BigInt(user), 2);
	b.writeBigUInt64LE(BigInt(channel), 10);
	b.writeBigUInt64LE(BigInt(message), 18);
	return b.toString('binary');
}

export interface DeserializedTargets {
	user: Snowflake;
	channel: Snowflake;
	message: Snowflake;
}

/**
 * Encode provided single target
 * @param op - The OP-Code to use
 * @param target - The target id
 * @returns Encoded binary
 */
export function serializeSingleTarget(op: number, target: Snowflake): string {
	const b = Buffer.alloc(2 + 8);
	b.writeUInt16LE(op);
	b.writeBigUInt64LE(BigInt(target), 2);
	return b.toString('binary');
}

/**
 * Deserialize a provided Buffer into a single target
 * @param buffer - The Buffer to deserialize
 * @returns The deserialized structure
 */
export function deserializeSingleTarget(buffer: Buffer): Snowflake {
	return `${buffer.readBigInt64LE(2)}` as const;
}

/**
 * Deserialize a provided buffer into a target structure
 * @param buffer - The Buffer to deserialize
 * @returns The deserialized structure
 */
export function deserializeTargets(buffer: Buffer): DeserializedTargets {
	return {
		user: `${buffer.readBigInt64LE(2)}` as const,
		channel: `${buffer.readBigInt64LE(10)}` as const,
		message: `${buffer.readBigInt64LE(18)}` as const,
	};
}

/**
 * Encode an OP Code into binary
 * @param op - The OP Code to use
 * @returns Encoded binary
 */
export function serializeOpCode(op: number): string {
	const b = Buffer.alloc(2);
	b.writeUInt16LE(op);
	return b.toString('binary');
}

/**
 * Clean a text from common impactful words that cause unwarranted perspective scores
 * @param initial - Text to clean
 * @returns Cleaned text
 */
export function cleanContent(initial: string): string {
	return initial.replace(/\b(?:fuck(?:ing)?|shi+t|(?:am|is|'m).*gay)\b/g, '').trim();
}

/**
 * Hashes a text with md5 to use for bucketing
 * @param initial - Text to hash
 * @returns Hashed text
 */
export function hashString(initial: string): string {
	return createHash('md5').update(initial).digest('hex');
}

/**
 * Builds a record from provided entry array
 * @param initial - Redis hashset records
 * @param transformer - Function to apply to each value
 * @returns The built record
 */
export function transformHashset<T>(
	initial: Record<string, string>,
	transformer: (element: string) => T,
): Record<string, T> {
	return Object.fromEntries(Object.entries(initial).map(([key, value]) => [key, transformer(value)]));
}

/**
 * Resolves notification rows to role- and userId as well as notification string
 * @param notifications - The Notification row entries to check
 * @param severityLevel - The required severity level
 * @param subjects - Subjects that should override severity
 * @returns
 */
export function resolveNotifications(notifications: Notification[], severityLevel = -1, subjects: string[] = []) {
	const notificationParts = [];
	const roles: Snowflake[] = [];
	const users: Snowflake[] = [];

	for (const notification of notifications) {
		if (severityLevel >= notification.level || notification.subjects.some((s) => subjects.includes(s))) {
			notificationParts.push(
				notification.type === 'ROLE' ? roleMention(notification.entity) : userMention(notification.entity),
			);
			(notification.type === 'ROLE' ? roles : users).push(notification.entity);
		}
	}

	return {
		notificationParts,
		roles,
		users,
	};
}
