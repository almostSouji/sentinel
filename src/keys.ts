import { Snowflake } from 'discord.js';

//* INT [1 (LOW), 2 (MEDIUM), 3 (HIGH)]
//* default: 1
// Level of strictness to apply to the guild
export const STRICTNESS = (guild: Snowflake) => `guild:${guild}:strictness`;

//* STR
// Log channel ID
export const CHANNELS_LOG = (guild: Snowflake) => `guild:${guild}:channels:log`;

//* SET<string>
// Channel IDs of watched channels
export const CHANNELS_WATCHING = (guild: Snowflake) => `guild:${guild}:channels:watching`;

//* SET
// Attributes to be shown
export const ATTRIBUTES = (guild: Snowflake) => `guild:${guild}:attributes`;

//* INT
// Counting how many times each attribute has been seen above the threshold at that time
export const ATTRIBUTE_SEEN = (guild: Snowflake, attribute: string) =>
	`guild:${guild}:attributes:seen:attribute:${attribute}`;

//* SET
// Role IDs that should be notified
export const NOTIF_ROLES = (guild: Snowflake) => `guild:${guild}:notifications:roles`;

//* INT [0, 100, 200]
// Amount of messages to pre-fetch from the log channel
export const PREFETCH = (guild: Snowflake) => `guild:${guild}:prefetch`;

//* SET
// User IDs that should be notified
export const NOTIF_USERS = (guild: Snowflake) => `guild:${guild}:notifications:users`;

//* INT [0 (NONE), 1 (MANAGE_MESSAGES), 2 (BAN_MEMBERS), 3 (ADMINISTRATOR)]
//* default: 0
// Permission required to be ignored by the application
export const IMMUNITY = (guild: Snowflake) => `guild:${guild}:immunity`;

//* INT
//* default: 0
// Severity level required to trigger a notification
export const NOTIF_LEVEL = (guild: Snowflake) => `guild:${guild}:notifications:level`;

//* STR
// Prefix notifications with text
export const NOTIF_PREFIX = (guild: Snowflake) => `guild:${guild}:notifications:prefix`;

//* ZSET<level, word>
// Flag words at provided level. Words are delimited by word boundaries, case insensitive
export const CUSTOM_FLAGS_WORDS = (guild: Snowflake) => `guild:${guild}:custom:flags:words`;

//* ZSET<level, phrase>
// Flag phrases at provided level. Phrases can appear anywhere in text, case insensitive
export const CUSTOM_FLAGS_PHRASES = (guild: Snowflake) => `guild:${guild}:custom:flags:phrases`;

//* INT
// Counting total messages seen per guild (edits also count)
export const MESSAGES_SEEN = (guild: Snowflake) => `guild:${guild}:messages:seen`;
//* INT
// Counting total messages checked per guild (edits also count)
export const MESSAGES_CHECKED = (guild: Snowflake) => `guild:${guild}:messages:checked`;

// 🧪 SET
// Guilds with debug mode enabled
export const DEBUG_GUILDS = 'debug:guilds';
