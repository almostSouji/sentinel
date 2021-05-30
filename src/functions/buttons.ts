import { MessageButton, Snowflake, MessageEmbed, Permissions, PermissionResolvable } from 'discord.js';
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
import { BUTTONS_MISSING_BOT_PERMISSIONS } from '../messages/messages';

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

export function banButton(
	targetUser: Snowflake,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	canBan: boolean,
): MessageButton {
	return new MessageButton({
		type: 2,
		style: 4,
		customID: BUTTON_ID_BAN(targetUser, targetChannel, targetMessage),
		label: BUTTON_LABEL_BAN,
		emoji: {
			id: EMOJI_ID_BAN_WHITE,
		},
		disabled: !canBan,
	});
}

export function deleteButton(
	targetUser: Snowflake,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	canDelete: boolean,
): MessageButton {
	return new MessageButton({
		type: 2,
		style: 4,
		customID: BUTTON_ID_DELETE(targetUser, targetChannel, targetMessage),
		label: BUTTON_LABEL_DELETE,
		emoji: {
			id: EMOJI_ID_DELETE_WHITE,
		},
		disabled: !canDelete,
	});
}

export const approveButton = new MessageButton({
	type: 2,
	style: 3,
	customID: BUTTON_ID_APPROVE,
	label: BUTTON_LABEL_APPROVE,
	emoji: {
		id: EMOJI_ID_APPROVE_WHITE,
	},
});

export const dismissButton = new MessageButton({
	type: 2,
	style: 2,
	customID: BUTTON_ID_DISMISS,
	label: BUTTON_LABEL_DISMISS,
});

export function generateButtons(
	targetChannel: Snowflake,
	targetUser: Snowflake,
	targetMessage: Snowflake,
	permissions: Readonly<Permissions> | null,
): MessageButton[] {
	const canBan = permissions?.has(Permissions.FLAGS.BAN_MEMBERS) ?? false;
	const canDelete = permissions?.has(Permissions.FLAGS.MANAGE_MESSAGES) ?? false;
	const res: MessageButton[] = [];
	if (targetUser !== '0') {
		res.push(banButton(targetUser, targetChannel, targetMessage, canBan));
	}

	if (targetChannel !== '0' && targetMessage !== '0') {
		res.push(deleteButton(targetUser, targetChannel, targetMessage, canDelete));
	}

	res.push(approveButton);
	res.push(dismissButton);
	return res;
}

export function checkAndApplyNotice(
	embed: MessageEmbed,
	checkAgainst: PermissionResolvable,
	permissions: Readonly<Permissions> | null,
) {
	const missing = new Permissions(permissions?.missing(checkAgainst) ?? []).toArray();
	const fieldIndex = embed.fields.findIndex((f) => f.name === EMBED_TITLE_NOTICE);
	if (fieldIndex > 0) {
		if (missing.length) {
			embed.spliceFields(fieldIndex, 1, {
				name: EMBED_TITLE_NOTICE,
				value: BUTTONS_MISSING_BOT_PERMISSIONS(missing),
			});
		} else {
			embed.spliceFields(fieldIndex, 1);
		}
	} else if (missing.length) {
		embed.spliceFields(1, 0, {
			name: EMBED_TITLE_NOTICE,
			value: BUTTONS_MISSING_BOT_PERMISSIONS(missing),
		});
	}
}
