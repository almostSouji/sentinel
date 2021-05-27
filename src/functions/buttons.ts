import { Client, MessageEmbed, MessageMentionOptions, Permissions, PermissionResolvable } from 'discord.js';
import {
	BUTTON_ID_APPROVE,
	BUTTON_ID_BAN,
	BUTTON_ID_DELETE,
	BUTTON_ID_DISMISS,
	BUTTON_LABEL_APPROVE,
	BUTTON_LABEL_BAN,
	BUTTON_LABEL_DELETE,
	BUTTON_LABEL_DISMISS,
	EMBED_TITLE_NOTICE,
	EMOJI_ID_APPROVE_WHITE,
	EMOJI_ID_BAN_WHITE,
	EMOJI_ID_DELETE_WHITE,
} from '../constants';
import { MISSING_PERMISSIONS } from '../messages/messages';

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
	disabled?: boolean;
}

export function banButton(targetUser: string, targetChannel: string, targetMessage: string, canBan: boolean) {
	return {
		type: 2,
		style: 4,
		custom_id: BUTTON_ID_BAN(targetUser, targetChannel, targetMessage),
		label: BUTTON_LABEL_BAN,
		emoji: {
			id: EMOJI_ID_BAN_WHITE,
		},
		disabled: !canBan,
	};
}

export function deleteButton(targetUser: string, targetChannel: string, targetMessage: string, canDelete: boolean) {
	return {
		type: 2,
		style: 4,
		custom_id: BUTTON_ID_DELETE(targetUser, targetChannel, targetMessage),
		label: BUTTON_LABEL_DELETE,
		emoji: {
			id: EMOJI_ID_DELETE_WHITE,
		},
		disabled: !canDelete,
	};
}

export const approveButton = {
	type: 2,
	style: 3,
	custom_id: BUTTON_ID_APPROVE,
	label: BUTTON_LABEL_APPROVE,
	emoji: {
		id: EMOJI_ID_APPROVE_WHITE,
	},
};

export const dismissButton = {
	type: 2,
	style: 2,
	custom_id: BUTTON_ID_DISMISS,
	label: BUTTON_LABEL_DISMISS,
};

export function sendWithButtons(
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

	checkAndApplyNotice(embed, ['BAN_MEMBERS', 'MANAGE_MESSAGES'], permissions ?? null);

	const canBan = permissions?.has('BAN_MEMBERS') ?? false;
	const canDelete = permissions?.has('MANAGE_MESSAGES') ?? false;
	response.data.components[0]?.components?.push(banButton(targetUser, targetChannel, targetMessage, canBan));
	response.data.components[0]?.components?.push(deleteButton(targetUser, targetChannel, targetMessage, canDelete));
	response.data.components[0]?.components?.push(approveButton);
	response.data.components[0]?.components?.push(dismissButton);

	api.channels(logChannel).messages.post(response);
}

export function checkAndApplyNotice(
	embed: MessageEmbed,
	checkAgainst: PermissionResolvable,
	permissions: Readonly<Permissions> | null,
) {
	const missing = permissions?.missing(checkAgainst) ?? [];
	const fieldIndex = embed.fields.findIndex((f) => f.name === EMBED_TITLE_NOTICE);
	if (fieldIndex > 0) {
		if (missing.length) {
			embed.spliceFields(fieldIndex, 1, {
				name: EMBED_TITLE_NOTICE,
				value: MISSING_PERMISSIONS(missing),
			});
		} else {
			embed.spliceFields(fieldIndex, 1);
		}
	} else if (missing.length) {
		embed.spliceFields(1, 0, {
			name: EMBED_TITLE_NOTICE,
			value: MISSING_PERMISSIONS(missing),
		});
	}
}
