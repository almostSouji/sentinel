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
