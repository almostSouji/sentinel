import { PerspectiveAttribute } from './perspective';

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
	resolvedat: number;
	resolvedbyuser: string | null;
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

export interface PerspectiveFeedback {
	id: number;
	incident: number;
	user: string;
	content: string;
	guild: string | null;
	wrongattributes: PerspectiveAttribute[];
	approved: boolean;
}

export enum IncidentResolvedBy {
	BUTTON_DELETE = 'BUTTON_DELETE',
	BUTTON_BAN = 'BUTTON_BAN',
	BUTTON_REVIEW = 'BUTTON_REVIEW',
	ACTION_EXPIRED = 'ACTION_EXPIRED',
	TASK_ERROR = 'TASK_ERROR',
	LOGCHANNEL_INVALID = 'LOGCHANNEL_INVALID',
	BELOW_BUTTON_LVL = 'BELOW_BUTTON_LVL',
	AUTO_BAN_SCAM = 'AUTO_BAN_SCAM',
	LEGACY = 'LEGACY',
	NO_LOGEMBED = 'NO_LOGEMBED',
	LOGMESSAGE_DELETED = 'LOGMESSAGE_DELETED',
	LOGCHANNEL_DELETED = 'LOGCHANNEL_DELETED',
	GUILD_MEMBER_BAN = 'GUILD_MEMBER_BAN',
}

export enum GuildSettingFlags {
	DEBUG = 'DEBUG',
	SCAMBAN = 'SCAMBAN',
	LOG_ALL = 'LOG_ALL',
	PERSPECTIVE_FEEDBACK = 'PERSPECTIVE_FEEDBACK',
}

export enum NotificationTopics {
	SPAM = 'SPAM',
}

export enum IncidentTypes {
	PERSPECTIVE = 'PERSPECTIVE',
	SPAM = 'SPAM',
}

export enum NotificationTargets {
	USER = 'USER',
	ROLE = 'ROLE',
}
