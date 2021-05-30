export const READY_LOG = (tag: string) => `${tag} is watching!`;
export const BAN_SUCCESS = (executor: string, target: string) =>
	`• \`${executor}\` banned \`${target}\` and cleaned their messages`;
export const DELETE_SUCCESS = (executor: string) => `• \`${executor}\` deleted the message`;
export const DELETE_FAIL_UNKNOWN = (executor: string) =>
	`• \`${executor}\` could not delete the message (unknown message)`;
export const DELETE_FAIL_OTHER = (executor: string) => `• \`${executor}\` could not delete the message`;
export const DISMISSED = (executor: string) => `• \`${executor}\` decided to take no further action`;
export const APPROVED = (executor: string) => `• \`${executor}\` approved this message`;
export const LOG_FOOTER_TEXT = (executor: string, id: string) => `Last action by ${executor} (${id})`;
export const MATCH_PHRASE = (phrase: string, value: number, isWord: boolean) =>
	`• Severity level \`${value}\` matched on ${isWord ? 'word' : 'phrase'} \`${phrase}\``;
export const BUTTONS_MISSING_BOT_PERMISSIONS = (missing: string[]) =>
	`Not all buttons could be enabled. Missing the following permissions in the channel the message was sent in:\n${missing
		.map((m) => `• \`${m}\``)
		.join('\n')}`;
export const BAN_FAIL_MISSING = (executor: string, target: string) =>
	`• \`${executor}\` could not ban \`${target}\` (missing permissions)`;
export const BAN_FAIL_UNKNOWN = (executor: string, target: string) =>
	`• \`${executor}\` could not ban \`${target}\` (unknown user)`;
export const BAN_FAIL_OTHER = (executor: string, target: string) => `• \`${executor}\` could not ban \`${target}\``;
