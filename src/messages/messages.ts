import { Snowflake } from 'discord.js';
import {
	MAX_TRIGGER_COUNT,
	MAX_TRIGGER_LENGTH,
	PREFIX_ERROR,
	PREFIX_LOCKED,
	PREFIX_NSFW,
	PREFIX_NYT,
	PREFIX_SUCCESS,
} from '../constants';

export const READY_LOG = (tag: string) => `${tag} is watching!`;
export const BAN_SUCCESS = (executor: string, target: string) =>
	`• \`${executor}\` banned \`${target}\` and cleaned their messages`;
export const DELETE_SUCCESS = (executor: string) => `• \`${executor}\` deleted the message`;
export const DELETE_FAIL_CHANNEL = (executor: string) =>
	`• \`${executor}\` could not delete the message (unknown channel)`;
export const DELETE_FAIL_MISSING = (executor: string) =>
	`• \`${executor}\` could not delete the message (missing permissions)`;
export const DELETE_FAIL_UNKNOWN = (executor: string) =>
	`• \`${executor}\` could not delete the message (unknown message)`;
export const DELETE_FAIL_OTHER = (executor: string) => `• \`${executor}\` could not delete the message`;
export const REVIEWED = (executor: string) => `• \`${executor}\` reviewed this message`;
export const MATCH_PHRASE = (phrase: string, level: string, isWord: boolean) =>
	`• Severity level ${level} matched on ${isWord ? 'word' : 'phrase'} \`${phrase}\``;
export const BAN_FAIL_MISSING = (executor: string, target: string) =>
	`• \`${executor}\` could not ban \`${target}\` (missing permissions)`;
export const BAN_FAIL_UNKNOWN = (executor: string, target: string) =>
	`• \`${executor}\` could not ban \`${target}\` (unknown user)`;
export const BAN_FAIL_OTHER = (executor: string, target: string) => `• \`${executor}\` could not ban \`${target}\``;

export const FLAGS_NONE = `Not flagged with any significant attributes.`;

export const BUTTON_PRESS_MISSING_PERMISSIONS_BAN = `To use the ban button you need permissions to ban members!`;
export const BUTTON_PRESS_MISSING_PERMISSIONS_DELETE = `To use the delete button you need permissions to delete messages in the channel this was flagged in!`;
export const BUTTON_PRESS_MISSING_PERMISSIONS_REVIEW = `To use the review button you need permissions to manage messages in the channel this was flagged in!`;

export const INTERACTION_NO_HANDLER = (cmd: string, id: string) =>
	`\`🐞\` No handler found for interaction command \`${cmd}\` \`${id}\`.`;

export const EXPLAIN_WORKING =
	`The bot watches configured channels, evaluates their contents against *perspective AI* and flags problematic messages in log channels.` as const;
export const EXPLAIN_PERCENTAGE =
	`• The data reflects how probable each attribute is reflected in the target message (90% likely to be toxic).` as const;
export const EXPLAIN_NYT =
	`${PREFIX_NYT} Trained on a single data source (New York Times comments tagged by their moderation team)` as const;
export const EXPLAIN_UPDATING =
	`• Buttons update based on permissions and member/message status (check for permission and hierarchy conflicts if buttons are greyed out)` as const;
export const EXPLAIN_PRIVATE =
	`• Sentinel is a private bot. If you have any feedback let me know! (\`Souji#0001\`).` as const;
export const EXPLAIN_NSFW = `${PREFIX_NSFW} Attributes are not considered in nsfw channels`;
export const EXPLAIN_FORCED = `${PREFIX_LOCKED} Attributes cannot be unwatched`;

export const NOT_IN_DM = 'You cannot use commands in direct messages.' as const;
export const CUSTOM_TAG =
	'Check if you watch any attributes! (custom tags are currently not supported in manual check mode.)' as const;

export const ERROR_LOGCHANNEL = `${PREFIX_ERROR} Logchannel invalid.` as const;
export const LOG_NOT_TEXT = (name: string, type: string) =>
	`${ERROR_LOGCHANNEL} (channel ${name} is of type \`${type}\`, needs to be text based)`;
export const LOG_NO_PERMS =
	`${ERROR_LOGCHANNEL} (application needs the permissions to embed and read messages and history in the log channel)` as const;
export const LOG_CHANNEL_SET = (channel: string) => `${PREFIX_SUCCESS} Log channel set to \`${channel}\``;

export const CONFIG_SHOW_CHANNEL_MISSING = `${PREFIX_ERROR} none (required)`;
export const CONFIG_SHOW_CHANNEL_MISSING_PERMISSIONS = (channel: Snowflake, missing: string) =>
	`${PREFIX_ERROR} <#${channel}> (missing permissions: ${missing})`;
export const CONFIG_IMMUNITY_SET = (permission: string) => `\`${permission}\``;
export const CONFIG_PREFETCH_SET = (amount: number) => `${PREFIX_SUCCESS} Prefetch messages on restart: \`${amount}\``;
export const CONFIG_ATTRIBUTES_ENABLED = (flags: string) => `${PREFIX_SUCCESS} Enabled flags: ${flags}`;
export const CONFIG_ATTRIBUTES_DISABLED = (flags: string) => `${PREFIX_SUCCESS} Disabled flags: ${flags}`;
export const CONFIG_ATTRIBUTES_NONE = `${PREFIX_ERROR} No attributes provided, aborting.` as const;
export const CONFIG_STRICTNESS_SET = (level: string) => `${PREFIX_SUCCESS} Strictness level set to: \`${level}\``;
export const CONFIG_SHOW_WATCHING_NONE = `${PREFIX_ERROR} none (required)` as const;
export const CONFIG_CHANNELS_ADD_MISSING_PERMISSIONS = (channels: string) =>
	`${PREFIX_ERROR} Cannot add channels: ${channels} (missing permissions to view or read message history)`;
export const CONFIG_CHANNELS_WRONG_TYPE = (action: string, channels: string) =>
	`${PREFIX_ERROR} Cannot ${action} channels: ${channels} (channels need to be text based).`;
export const CONFIG_CHANNELS_NONE = (action: string) => `${PREFIX_ERROR} Cannot ${action} any channels.`;
export const CONFIG_CHANNELS_CHANGED = (action: string, channels: string) =>
	`${PREFIX_SUCCESS} Channel watch list edited. Successfully ${
		action === 'remove' ? 'removed' : 'added'
	} channels: ${channels}`;

export const NOTIFY_ROLE_ADD = (role: string, level: string) =>
	`Added a notification for <@&${role}> at level ${level}.`;
export const NOTIFY_ROLE_REMOVE = (role: string) => `Removed the notification for <@&${role}>.`;
export const NOTIFY_USER_ADD = (role: string, level: string) =>
	`Added a notification for <@${role}> at level ${level}.`;
export const NOTIFY_USER_REMOVE = (user: string) => `Removed the notification for <@${user}>.`;
export const NOTIFY_USER_SHOW = (user: string, level: string) => `• <@${user}> at level ${level}`;
export const NOTIFY_ROLE_SHOW = (role: string, level: string) => `• <@&${role}> at level ${level}`;
export const NOTIFY_NONE = `${PREFIX_ERROR} No notifications set.` as const;

export const CUSTOM_SHOW = (prefix: string, phrase: string, level: string) => `• ${prefix} \`${phrase}\` ${level}`;
export const CUSTOM_NONE = `${PREFIX_ERROR} no custom triggers set up.` as const;
export const CUSTOM_SET = (prefix: string, phrase: string, level: string) =>
	`${PREFIX_SUCCESS} Set ${prefix} \`${phrase}\` to trigger level ${level}.`;
export const CUSTOM_REMOVE = (prefix: string, phrase: string) =>
	`${PREFIX_SUCCESS} Removed ${prefix} trigger on \`${phrase}\`.`;
export const CUSTOM_NOT = (prefix: string, phrase: string) =>
	`${PREFIX_ERROR} Could not remove ${prefix} trigger on \`${phrase}\`.`;
export const CUSTOM_LIMIT = `${PREFIX_ERROR} max amount of custom triggers reached (${MAX_TRIGGER_COUNT}).`;
export const CUSTOM_LENGTH =
	`${PREFIX_ERROR} custom trigger max length (${MAX_TRIGGER_LENGTH}) exceeded. Try to flag relevant subphrases instead of using wordy triggers.` as const;

export const FETCHLOG_CHANNELTYPE = `${PREFIX_ERROR} channel type invalid`;
export const FETCHLOG_GUILD = (should: Snowflake, actual: Snowflake) =>
	`${PREFIX_ERROR} guild id forged. Is: \`${actual}\` should be \`${should}\`.`;
export const FETCHLOG_NOTLOG = `${PREFIX_ERROR} provided message does not resolve to a log message.`;

export const KARMA_NO_DATA = (user: string) => `${PREFIX_ERROR} Cannot find any data on \`${user}\``;
export const TEST_NO_CONTENT = `${PREFIX_ERROR} Cannot test empty messages.` as const;
