export enum Strictness {
	LOW = 1,
	MEDIUM,
	HIGH,
}

export enum Immunity {
	'NONE',
	'MANAGE_MESSAGES',
	'BAN_MEMBERS',
	'ADMINISTRATOR',
}

export interface Incident {
	id: number;
	type: string;
	message: string | null;
	channel: string | null;
	guild: string;
	user: string;
	attributes: string[];
	flags: string[];
	severity: number | null;
	createdat: number;
	expiresat: number;
	logchannel: string | null;
	logmessage: string | null;
	resolvedby: boolean;
}

export interface UserStats {
	user: string;
	guild: string;
	messages: number;
}

export interface GuildSettings {
	guild: string;
	logchannel: string | null;
	strictness: number;
	watching: string[];
	attributes: string[];
	prefetch: number;
	immunity: string;
	flags: string[];
	locale: string;
	spamthreshold: number | null;
}

export interface Notification {
	guild: string;
	entity: string;
	type: string;
	level: number;
	subjects: string[];
}

export enum IncidentResolvedBy {
	BUTTON_DELETE = 'BUTTON_DELETE',
	BUTTON_BAN = 'BUTTON_BAN',
	BUTTON_REVIEW = 'BUTTON_REVIEW',
	ACTION_EXPIRED = 'ACTION_EXPIRED',
	MESSAGE_DELETED = 'MESSAGE_DELETED',
	CHANNEL_DELETED = 'CHANNEL_DELETED',
	LOGCHANNEL_DELETED = 'LOGCHANNEL_DELETED',
	LOGMESSAGE_DELETED = 'LOGMESSAGE_DELETED',
	NO_BUTTONS_LEFT = 'NO_BUTTONS_LEFT',
	TASK_ERROR = 'TASK_ERROR',
	LOGCHANNEL_INVALID = 'LOGCHANNEL_INVALID',
	BELOW_BUTTON_LVL = 'BELOW_BUTTON_LVL',
	AUTO_BAN_SCAM = 'AUTO_BAN_SCAM',
	LEGACY = 'LEGACY',
}

export enum GuildSettingFlags {
	DEBUG = 'DEBUG',
	SCAMBAN = 'SCAMBAN',
	LOG_ALL = 'LOG_ALL',
}

export enum NotificationTopics {
	SPAM = 'SPAM',
}

export enum IncidentTypes {
	PERSPECTIVE = 'PERSPECTIVE',
	SPAM = 'SPAM',
}
