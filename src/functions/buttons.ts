import { MessageButton, Snowflake, Permissions, GuildMember } from 'discord.js';
import { OpCodes } from '..';
import {
	BUTTON_LABEL_BAN,
	BUTTON_LABEL_DELETE,
	BUTTON_LABEL_LIST,
	BUTTON_LABEL_REVIEW,
	EMOJI_ID_BAN_WHITE,
	EMOJI_ID_DELETE_WHITE,
	EMOJI_ID_LIST_WHITE,
	EMOJI_ID_REVIEW_WHITE,
} from '../constants';
import { serializeAttributes, serializeTargets } from './util';

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
		customID: serializeTargets(OpCodes.BAN, targetUser, targetChannel, targetMessage),
		label: BUTTON_LABEL_BAN,
		emoji: EMOJI_ID_BAN_WHITE,
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
		customID: serializeTargets(OpCodes.DELETE, targetUser, targetChannel, targetMessage),
		label: BUTTON_LABEL_DELETE,
		emoji: EMOJI_ID_DELETE_WHITE,
		disabled: !canDelete,
	});
}

export function reviewButton(targetUser: Snowflake, targetChannel: Snowflake, targetMessage: Snowflake): MessageButton {
	return new MessageButton({
		type: 2,
		style: 1,
		customID: serializeTargets(OpCodes.REVIEW, targetUser, targetChannel, targetMessage),
		label: BUTTON_LABEL_REVIEW,
		emoji: EMOJI_ID_REVIEW_WHITE,
	});
}

export const listButton = (values: number[]) => {
	return new MessageButton({
		type: 2,
		style: 2,
		customID: serializeAttributes(OpCodes.LIST, values),
		label: BUTTON_LABEL_LIST,
		emoji: EMOJI_ID_LIST_WHITE,
	});
};

export function generateButtons(
	targetChannel: Snowflake,
	targetUser: Snowflake,
	targetMessage: Snowflake,
	values: number[],
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

	res.push(reviewButton(targetUser, targetChannel, targetMessage));
	if (values.length) {
		res.push(listButton(values));
	}
	return res;
}
