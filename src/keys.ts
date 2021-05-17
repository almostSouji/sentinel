//* STR
// Log channel ID
export const CHANNELS_LOG = (guild: string) => `guild:${guild}:channels:log`;

//* SET<string>
// Channel IDs of watched channels
export const CHANNELS_WATCHING = (guild: string) => `guild:${guild}:channels:watching`;

//* INT
//* default: 0
// Probability required to flag an attribute as high
export const ATTRIBUTES_HIGH_THRESHOLD = (guild: string) => `guild:${guild}:attributes:high:threshold`;

//* INT
//* default: 1
// Amount of high attributes required to flag the message as severity level 2
export const ATTRIBUTES_HIGH_AMOUNT = (guild: string) => `guild:${guild}:attributes:high:amount`;

//* ZSET<percentage, attribute>
// Attributes and thresholds for them to be shown
export const ATTRIBUTES = (guild: string) => `guild:${guild}:attributes`;

//* INT
//* default: 0
// Amount of attributes above threshold required for the message to be logged
export const ATTRIBUTES_AMOUNT = (guild: string) => `guild:${guild}:attributes:amount`;

//* INT
//* default: 0
// Probability required to contribute to the attribute amount
export const ATTRIBUTES_THRESHOLD = (guild: string) => `guild:${guild}:attributes:threshold`;

//* ZSET<percentage, attribute>
// Attributes and thresholds for them to count as severe
export const ATTRIBUTES_SEVERE = (guild: string) => `guild:${guild}:attributes:severe`;

//* INT
//* default: 1
// Amount of severe attributes required to flag the message as severity level 3
export const ATTRIBUTES_SEVERE_AMOUNT = (guild: string) => `guild:${guild}:attributes:severe:amount`;

//* SET
// Role IDs that should be notified
export const NOTIF_ROLES = (guild: string) => `guild:${guild}:notifications:roles`;

//* SET
// User IDs that should be notified
export const NOTIF_USERS = (guild: string) => `guild:${guild}:notifications:users`;

//* INT
//* default: 0
// Severity level required to trigger a notification
export const NOTIF_LEVEL = (guild: string) => `guild:${guild}:notifications:level`;

//* STR
// Prefix notifications with text
export const NOTIF_PREFIX = (guild: string) => `guild:${guild}:notifications:prefix`;

//* ZSET<level, word>
// Flag words at provided level. Words are delimited by word boundaries, case insensitive
export const CUSTOM_FLAGS_WORDS = (guild: string) => `guild:${guild}:custom:flags:words`;

//* ZSET<level, phrase>
// Flag phrases at provided level. Phrases can appear anywhere in text, case insensitive
export const CUSTOM_FLAGS_PHRASES = (guild: string) => `guild:${guild}:custom:flags:phrases`;

//* Science
export const SCIENCE_MESSAGES = `science:message_scores`;
export const SCIENCE_REQUESTS = `science:requests`;

// 🧪 INT
// Level required for buttons to trigger
export const EXPERIMENT_BUTTONS_LEVEL = (guild: string) => `guild:${guild}:experiment:buttons:level`;
// 🧪 STR ["check"]
// Button permission mode. No executor permission checks by default
export const EXPERIMENT_BUTTONS = (guild: string) => `guild:${guild}:experiment:buttons`;

// 🧪 STR
// Ignore messages starting with character sequence
export const EXPERIMENT_IGNORE = (guild: string) => `guild:${guild}:experiment:ignore:prefix`;
