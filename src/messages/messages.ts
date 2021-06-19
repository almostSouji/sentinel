import { Snowflake } from 'discord.js';
import { PREFIX_ERROR, PREFIX_SUCCESS } from '../constants';

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
export const MATCH_PHRASE = (phrase: string, value: number, isWord: boolean) =>
	`• Severity level \`${value}\` matched on ${isWord ? 'word' : 'phrase'} \`${phrase}\``;
export const BAN_FAIL_MISSING = (executor: string, target: string) =>
	`• \`${executor}\` could not ban \`${target}\` (missing permissions)`;
export const BAN_FAIL_UNKNOWN = (executor: string, target: string) =>
	`• \`${executor}\` could not ban \`${target}\` (unknown user)`;
export const BAN_FAIL_OTHER = (executor: string, target: string) => `• \`${executor}\` could not ban \`${target}\``;

export const VERDICT = (flags: string) => `Likely ${flags}.`;
export const VERDICT_NONE = `Not flagged with any significant attributes.`;

export const BUTTON_PRESS_MISSING_PERMISSIONS_BAN = `To use the ban button you need permissions to ban members!`;
export const BUTTON_PRESS_MISSING_PERMISSIONS_DELETE = `To use the delete button you need permissions to delete messages in the channel this was flagged in!`;
export const BUTTON_PRESS_MISSING_PERMISSIONS_REVIEW = `To use the review button you need permissions to manage messages in the channel this was flagged in!`;

export const EXPLAIN_WORKING = `The bot watches configured channels, evaluates their contents against *perspective AI* and flags problematic messages in log channels.` as const;
export const EXPLAIN_PERCENTAGE = `• The data reflects how probable each attribute is reflected in the target message (90% likely to be toxic).` as const;
export const EXPLAIN_NYT = `¹ trained on a single data source (New York Times comments tagged by their moderation team)` as const;
export const EXPLAIN_UPDATING = `• Buttons update based on permissions and member/message status (check for permission and hierarchy conflicts if buttons are greyed out)` as const;
export const EXPLAIN_PRIVATE = `• Sentinel is a private bot. If you have any feedback let me know! (\`Souji#0001\`).` as const;

export const NOT_IN_DM = 'You can not use commands in direct messages.' as const;
export const CUSTOM_TAG = 'Check if you watch any attributes! (custom tags are currently not supported in manual check mode.)' as const;

export const ERROR_LOGCHANNEL = `${PREFIX_ERROR} Logchannel invalid.` as const;
export const LOG_NOT_TEXT = (name: string, type: string) =>
	`${ERROR_LOGCHANNEL} (channel ${name} is of type \`${type}\`, needs to be text based)`;
export const LOG_NO_PERMS = `${ERROR_LOGCHANNEL} (application needs the permissions to embed and read messages and history in the log channel)` as const;
export const LOG_CHANNEL_SET = (channel: string) => `${PREFIX_SUCCESS} Log channel set to \`${channel}\``;

export const CONFIG_SHOW_CHANNEL_MISSING = `${PREFIX_ERROR} Log channel: none (required)`;
export const CONFIG_SHOW_CHANNEL_MISSING_PERMISSIONS = (channel: Snowflake, missing: string) =>
	`${PREFIX_ERROR} Log channel: <#${channel}> (missing permissions: ${missing})`;
export const CONFIG_IMMUNITY_SET = (permission: string) =>
	`${PREFIX_SUCCESS} Immunity permission set to: \`${permission}\``;
export const CONFIG_PREFETCH_SET = (amount: number) => `${PREFIX_SUCCESS} Prefetch messages on restart: \`${amount}\``;
export const CONFIG_ATTRIBUTES_ENABLED = (flags: string) => `${PREFIX_SUCCESS} Enabled flags: ${flags}`;
export const CONFIG_ATTRIBUTES_DISABLED = (flags: string) => `${PREFIX_SUCCESS} Disabled flags: ${flags}`;

export const CONFIG_SHOW_CHANNEL = (channel: Snowflake) => `${PREFIX_SUCCESS} Log channel: <#${channel}>`;
export const CONFIG_SHOW_IMMUNITY = (permission: string) => `${PREFIX_SUCCESS} Immunity permission: \`${permission}\``;
export const CONFIG_SHOW_PREFETCH = (amount: number) => `${PREFIX_SUCCESS} Prefetch messages on restart: \`${amount}\``;
export const CONFIG_SHOW_ATTRIBUTES = (flags: string) => `${PREFIX_SUCCESS} Tracking attributes: ${flags}`;
export const CONFIG_SHOW_ATTRIBUTES_NONE = `${PREFIX_ERROR} Not tracking any attributes (required)` as const;
export const CONFIG_SHOW_WATCHING_NONE = `${PREFIX_ERROR} Not watching any channels (required)` as const;
export const CONFIG_SHOW_WATCHING = (channels: string) => `${PREFIX_SUCCESS} Watching channels: ${channels}`;

export const CONFIG_CHANNELS_ADD_INVALID = `${PREFIX_ERROR} Can not add channels` as const;
export const CONFIG_CHANNELS_ADD_MISSING_PERMISSIONS = (channels: string) =>
	`${CONFIG_CHANNELS_ADD_INVALID}: ${channels} (missing permissions to view or read message history)`;
export const CONFIG_CHANNELS_ADD_WRONG_TYPE = (channels: string) =>
	`${CONFIG_CHANNELS_ADD_INVALID}: ${channels} (channels need to be text based)`;
export const CONFIG_CHANNEL_ADD = (channels: string) =>
	`${PREFIX_SUCCESS} Added channels to the watch list: ${channels}`;
export const CONFIG_CHANNELS_ADD_NONE = `${PREFIX_ERROR} No channels could be added.` as const;
export const CONFIG_CHANNELS_REMOVE_WRONG_TYPE = (channels: string) =>
	`${PREFIX_ERROR} Can not remove non-text channels: ${channels}`;
export const CONFIG_CHANNELS_REMOVE = (channels: string) =>
	`${PREFIX_SUCCESS} Removed channels from the watch list: ${channels}`;
export const CONFIG_CHANNELS_REMOVE_NONE = `${PREFIX_ERROR} No channels could be removed.` as const;
