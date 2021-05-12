import { Attribute } from '..';

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
	monitor_channels: string[] | null;
}

export interface AttributeData {
	key: Attribute;
	threshold: number | null;
}
