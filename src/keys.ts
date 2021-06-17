import { Snowflake } from 'discord.js';

//* STR
// Log channel ID
export const CHANNELS_LOG = (guild: Snowflake) => `guild:${guild}:channels:log`;

//* SET<string>
// Channel IDs of watched channels
export const CHANNELS_WATCHING = (guild: Snowflake) => `guild:${guild}:channels:watching`;

//* INT
//* default: 0
// Probability required to flag an attribute as high
export const ATTRIBUTES_HIGH_THRESHOLD = (guild: Snowflake) => `guild:${guild}:attributes:high:threshold`;

//* INT
//* default: 1
// Amount of high attributes required to flag the message as severity level 2
export const ATTRIBUTES_HIGH_AMOUNT = (guild: Snowflake) => `guild:${guild}:attributes:high:amount`;

//* ZSET<percentage, attribute>
// Attributes and thresholds for them to be shown
export const ATTRIBUTES = (guild: Snowflake) => `guild:${guild}:attributes`;

//* INT
//* default: 0
// Amount of attributes above threshold required for the message to be logged
export const ATTRIBUTES_AMOUNT = (guild: Snowflake) => `guild:${guild}:attributes:amount`;

//* INT
//* default: 0
// Probability required to contribute to the attribute amount
export const ATTRIBUTES_THRESHOLD = (guild: Snowflake) => `guild:${guild}:attributes:threshold`;

//* ZSET<percentage, attribute>
// Attributes and thresholds for them to count as severe
export const ATTRIBUTES_SEVERE = (guild: Snowflake) => `guild:${guild}:attributes:severe`;

//* INT
//* default: 1
// Amount of severe attributes required to flag the message as severity level 3
export const ATTRIBUTES_SEVERE_AMOUNT = (guild: Snowflake) => `guild:${guild}:attributes:severe:amount`;

//* INT
// Counting how many times each attribute has been seen above the threshold at that time
export const ATTRIBUTE_SEEN = (guild: Snowflake, attribute: string) =>
	`guild:${guild}:attributes:seen:attribute:${attribute}`;

//* SET
// Role IDs that should be notified
export const NOTIF_ROLES = (guild: Snowflake) => `guild:${guild}:notifications:roles`;

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

// 🧪 INT
// Level required for buttons to trigger
export const EXPERIMENT_BUTTONS_LEVEL = (guild: Snowflake) => `guild:${guild}:experiment:buttons:level`;

// 🧪 INT
// Amount of messages to pre-fetch from the log channel
export const EXPERIMENT_PREFETCH = (guild: Snowflake) => `guild:${guild}:experiment:prefetch`;

// 🧪 STR ["always"]
// Explain button mode. Only with other buttons by default
export const EXPERIMENT_EXPLAIN = (guild: Snowflake) => `guild:${guild}:experiment:buttons:explain`;
