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
	message: string;
	guild: string;
	author: string;
	createdAt: number;
	attributes: string[];
	flags: string[];
	severity: number;
}

export interface UserStats {
	user: string;
	guild: string;
	messages: number;
}

export interface GuildSettings {
	guild: string;
	logchannel?: string;
	strictness: number;
	watching: string[];
	attributes: string[];
	prefetch: number;
	immunity: string;
	flags: string[];
	locale: string;
}

export interface Notification {
	guild: string;
	entity: string;
	type: string;
	level: number;
}
