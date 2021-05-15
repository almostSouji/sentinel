import { Client, MessageEmbed, MessageMentionOptions } from 'discord.js';

export interface ResponseData {
	data: {
		content: string | null;
		embed: any;
		components: Component[];
		allowed_mentions: any;
	};
}

export interface Component {
	type: number;
	components?: Component[];
	style?: number;
	custom_id?: string;
	label?: string;
	emoji?: {
		id: string;
	};
}

export function buttons(
	client: Client,
	channel: string,
	embed: MessageEmbed,
	targetUser: string,
	targetMessage: string,
	content: string | null,
	allowed_mentions: MessageMentionOptions,
): void {
	// eslint-disable-next-line @typescript-eslint/dot-notation
	const api = client['api'] as any;
	const response: ResponseData = {
		data: {
			content,
			embed,
			components: [
				{
					type: 1,
					components: [],
				},
			],
			allowed_mentions,
		},
	};

	response.data.components[0].components?.push({
		type: 2,
		style: 4,
		custom_id: `ban_and_delete-${targetUser}-${channel}/${targetMessage}`,
		label: 'Ban & Delete',
		emoji: {
			id: '842911192489787412',
		},
	});

	response.data.components[0].components?.push({
		type: 2,
		style: 4,
		custom_id: `delete-${targetUser}-${channel}/${targetMessage}`,
		label: 'Delete',
		emoji: {
			id: '842716273900257352',
		},
	});

	response.data.components[0].components?.push({
		type: 2,
		style: 3,
		custom_id: `approve`,
		label: 'Approve',
		emoji: {
			id: '842912618095706192',
		},
	});

	response.data.components[0].components?.push({
		type: 2,
		style: 2,
		custom_id: `dismiss`,
		label: 'Dismiss',
	});

	api.channels(channel).messages.post(response);
}
