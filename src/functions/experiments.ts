import { Client, MessageEmbed, MessageMentionOptions, Permissions } from 'discord.js';
import {
	BUTTON_ID_APPROVE,
	BUTTON_ID_BAN_AND_DELETE,
	BUTTON_ID_DELETE,
	BUTTON_ID_DISMISS,
	BUTTON_LABEL_APPROVE,
	BUTTON_LABEL_BAN_AND_DELETE,
	BUTTON_LABEL_DELETE,
	BUTTON_LABEL_DISMISS,
	EMOJI_ID_APPROVE_WHITE,
	EMOJI_ID_BAN_WHITE,
	EMOJI_ID_DELETE_WHITE,
} from '../constants';

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
	logChannel: string,
	targetChannel: string,
	embed: MessageEmbed,
	targetUser: string,
	targetMessage: string,
	content: string | null,
	permissions: Readonly<Permissions> | null,
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

	if (permissions?.has(['BAN_MEMBERS', 'MANAGE_MESSAGES'])) {
		response.data.components[0].components?.push({
			type: 2,
			style: 4,
			custom_id: BUTTON_ID_BAN_AND_DELETE(targetUser, targetChannel, targetMessage),
			label: BUTTON_LABEL_BAN_AND_DELETE,
			emoji: {
				id: EMOJI_ID_BAN_WHITE,
			},
		});
	}

	if (permissions?.has('MANAGE_MESSAGES')) {
		response.data.components[0].components?.push({
			type: 2,
			style: 4,
			custom_id: BUTTON_ID_DELETE(targetUser, targetChannel, targetMessage),
			label: BUTTON_LABEL_DELETE,
			emoji: {
				id: EMOJI_ID_DELETE_WHITE,
			},
		});
	}

	response.data.components[0].components?.push({
		type: 2,
		style: 3,
		custom_id: BUTTON_ID_APPROVE,
		label: BUTTON_LABEL_APPROVE,
		emoji: {
			id: EMOJI_ID_APPROVE_WHITE,
		},
	});

	response.data.components[0].components?.push({
		type: 2,
		style: 2,
		custom_id: BUTTON_ID_DISMISS,
		label: BUTTON_LABEL_DISMISS,
	});

	api.channels(logChannel).messages.post(response);
}
