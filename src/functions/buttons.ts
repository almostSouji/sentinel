import { MessageButton, Snowflake, Permissions, GuildMember } from 'discord.js';
import {
	BUTTON_ID_APPROVE,
	BUTTON_ID_BAN,
	BUTTON_ID_DELETE,
	BUTTON_ID_DISMISS,
	BUTTON_LABEL_APPROVE,
	BUTTON_LABEL_BAN,
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
	targetMember: GuildMember | null,
): MessageButton[] {
	const res: MessageButton[] = [];
	const canDelete = permissions?.has(Permissions.FLAGS.MANAGE_MESSAGES) ?? false;
	if (targetUser !== '0') {
		res.push(banButton(targetUser, targetChannel, targetMessage, targetMember?.bannable ?? true));
	}

	if (targetChannel !== '0' && targetMessage !== '0') {
		res.push(deleteButton(targetUser, targetChannel, targetMessage, canDelete));
	}

	res.push(approveButton);
	res.push(dismissButton);
	return res;
}
