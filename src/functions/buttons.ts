import { MessageButton, Snowflake, Permissions, GuildMember } from 'discord.js';
import i18next from 'i18next';
import { OpCodes } from '..';
import { EMOJI_ID_BAN_WHITE, EMOJI_ID_DELETE_WHITE, EMOJI_ID_REVIEW_WHITE } from '../constants';
import { serializeSingleTarget, serializeTargets } from '../utils';

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

export function banSingleButton(targetUser: Snowflake, canBan: boolean, locale: string): MessageButton {
	return new MessageButton({
		type: 2,
		style: 4,
		customId: serializeSingleTarget(OpCodes.BAN_SPAM, targetUser),
		label: i18next.t('buttons.labels.ban', {
			lng: locale,
		})!,
		emoji: EMOJI_ID_BAN_WHITE,
		disabled: !canBan,
	});
}

export function reviewSingleButton(targetUser: Snowflake, locale: string): MessageButton {
	return new MessageButton({
		type: 2,
		style: 1,
		customId: serializeSingleTarget(OpCodes.REVIEW_SPAM, targetUser),
		label: i18next.t('buttons.labels.review', {
			lng: locale,
		})!,
		emoji: EMOJI_ID_REVIEW_WHITE,
	});
}

export function banButton(
	targetUser: Snowflake,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	canBan: boolean,
	locale: string,
): MessageButton {
	return new MessageButton({
		type: 2,
		style: 4,
		customId: serializeTargets(OpCodes.BAN, targetUser, targetChannel, targetMessage),
		label: i18next.t('buttons.labels.ban', {
			lng: locale,
		})!,
		emoji: EMOJI_ID_BAN_WHITE,
		disabled: !canBan,
	});
}

export function deleteButton(
	targetUser: Snowflake,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	canDelete: boolean,
	locale: string,
): MessageButton {
	return new MessageButton({
		type: 2,
		style: 4,
		customId: serializeTargets(OpCodes.DELETE, targetUser, targetChannel, targetMessage),
		label: i18next.t('buttons.labels.delete', {
			lng: locale,
		})!,
		emoji: EMOJI_ID_DELETE_WHITE,
		disabled: !canDelete,
	});
}

export function reviewButton(
	targetUser: Snowflake,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	locale: string,
): MessageButton {
	return new MessageButton({
		type: 2,
		style: 1,
		customId: serializeTargets(OpCodes.REVIEW, targetUser, targetChannel, targetMessage),
		label: i18next.t('buttons.labels.review', {
			lng: locale,
		})!,
		emoji: EMOJI_ID_REVIEW_WHITE,
	});
}

export function generateButtons(
	targetChannel: Snowflake,
	targetUser: Snowflake,
	targetMessage: Snowflake,
	permissions: Readonly<Permissions> | null,
	targetMember: GuildMember | null,
	locale: string,
): MessageButton[] {
	const res: MessageButton[] = [];
	const canDelete = permissions?.has(Permissions.FLAGS.MANAGE_MESSAGES) ?? false;
	if (targetUser !== '0') {
		res.push(banButton(targetUser, targetChannel, targetMessage, targetMember?.bannable ?? true, locale));
	}

	if (targetChannel !== '0' && targetMessage !== '0') {
		res.push(deleteButton(targetUser, targetChannel, targetMessage, canDelete, locale));
	}

	res.push(reviewButton(targetUser, targetChannel, targetMessage, locale));
	return res;
}
