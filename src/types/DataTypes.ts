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
	createdAt: number;
	expiresAt: number;
	logChannel: string | null;
	logMessage: string | null;
	expired: boolean;
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
