export const COLOR_SEVERE = '#ed4245' as const;
export const COLOR_ALERT = 'faa61a' as const;
export const COLOR_MILD = '#3ba55c' as const;
export const COLOR_DARK = '#2f3136' as const;
export const COLOR_PURPLE = '#5865F2' as const;
export const EMOJI_ID_DELETE_WHITE = '842716273900257352' as const;
export const EMOJI_ID_REVIEW_WHITE = '842912618095706192' as const;
export const EMOJI_ID_BAN_WHITE = '850144185020842055' as const;
export const BUTTON_LABEL_BAN = 'Cleanban' as const;
export const BUTTON_LABEL_FORCE_BAN = 'Ban (Force)' as const;
export const BUTTON_LABEL_DELETE = 'Delete' as const;
export const BUTTON_LABEL_REVIEW = 'Review' as const;
export const BUTTON_LABEL_QUESTION = '' as const;
export const BUTTON_ACTION_REVIEW = 'review' as const;
export const BUTTON_ACTION_QUESTION = 'question' as const;
export const BUTTON_ACTION_BAN = 'ban' as const;
export const BUTTON_ACTION_DELETE = 'delete' as const;
export const BUTTON_ID_REVIEW = (targetuser: string, targetChannel: string, targetMessage: string) =>
	`${BUTTON_ACTION_REVIEW}-${targetuser}-${targetChannel}/${targetMessage}`;
export const BUTTON_ID_QUESTION = BUTTON_ACTION_QUESTION;
export const BUTTON_ID_DELETE = (targetUser: string, targetChannel: string, targetMessage: string) =>
	`${BUTTON_ACTION_DELETE}-${targetUser}-${targetChannel}/${targetMessage}`;
export const BUTTON_ID_BAN = (targetUser: string, targetChannel: string, targetMessage: string) =>
	`${BUTTON_ACTION_BAN}-${targetUser}-${targetChannel}/${targetMessage}`;
export const ERROR_CODE_UNKNOWN_MESSAGE = 10008 as const;
export const ERROR_CODE_UNKNOWN_USER = 10013 as const;
export const ERROR_CODE_MISSING_PERMISSIONS = 50013 as const;
