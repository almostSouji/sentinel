import { PerspectiveAttribute } from './perspective';

// Config:

export interface Config {
	guilds: ConfigGuildData[];
}

export interface ConfigGuildData {
	id: string | null;
	webhook_token: string | null;
	webhook_id: string | null;
	severe_attributes: AttributeData[] | null;
	high_threshold: number | null;
	high_amount: number | null;
	log_threshold: number | null;
	log_amount: number | null;
	monitor_channels: string[] | null;
	notifications: NotificationData | null;
	monitor_attributes: AttributeData[] | null;
	attribute_threshold: number | null;
	severe_amount: number | null;
}

export interface AttributeData {
	key: PerspectiveAttribute;
	threshold: number | null;
}

export interface NotificationData {
	roles: string[] | null;
	users: string[] | null;
	level: number | null;
	prefix: string | null;
}
