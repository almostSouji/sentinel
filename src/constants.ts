export const COLOR_SEVERE = '#ed4245' as const;
export const COLOR_ALERT = 'faa61a' as const;
export const COLOR_MILD = '#3ba55c' as const;
export const COLOR_DARK = '#2f3136' as const;
export const EMOJI_ID_DELETE_WHITE = '842716273900257352' as const;
export const EMOJI_ID_APPROVE_WHITE = '842912618095706192' as const;
export const EMOJI_ID_BAN_WHITE = '842911192489787412' as const;
export const BUTTON_LABEL_BAN_AND_DELETE = 'Ban & Delete' as const;
export const BUTTON_LABEL_BAN = 'Ban' as const;
export const BUTTON_LABEL_DELETE = 'Delete' as const;
export const BUTTON_LABEL_APPROVE = 'Approve' as const;
export const BUTTON_LABEL_DISMISS = 'Acknowledge' as const;
export const BUTTON_ACTION_APPROVE = 'approve';
export const BUTTON_ACTION_DISMISS = 'dismiss';
export const BUTTON_ACTION_BAN_AND_DELETE = 'ban_and_delete';
export const BUTTON_ACTION_BAN = 'ban';
export const BUTTON_ACTION_DELETE = 'delete';
export const BUTTON_ID_APPROVE = BUTTON_ACTION_APPROVE;
export const BUTTON_ID_DISMISS = BUTTON_ACTION_DISMISS;
export const BUTTON_ID_BAN_AND_DELETE = (targetUser: string, targetChannel: string, targetMessage: string) =>
	`${BUTTON_ACTION_BAN_AND_DELETE}-${targetUser}-${targetChannel}/${targetMessage}`;
export const BUTTON_ID_DELETE = (targetUser: string, targetChannel: string, targetMessage: string) =>
	`${BUTTON_ACTION_DELETE}-${targetUser}-${targetChannel}/${targetMessage}`;
export const BUTTON_ID_BAN = (targetUser: string, targetChannel: string, targetMessage: string) =>
	`${BUTTON_ACTION_BAN}-${targetUser}-${targetChannel}/${targetMessage}`;
