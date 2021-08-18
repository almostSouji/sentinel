import { Constants, MessageButton } from 'discord.js';
import i18next from 'i18next';
import { OpCodes } from '..';
import { generateIncidentButtonId } from '../utils';

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

export function banButton(incidentId: number, canBan: boolean, locale: string): MessageButton {
	return new MessageButton({
		style: Constants.MessageButtonStyles.DANGER,
		customId: generateIncidentButtonId(OpCodes.BAN, incidentId),
		label: i18next.t('buttons.labels.ban', {
			lng: locale,
		})!,
		disabled: !canBan,
	});
}

export function deleteButton(incidentId: number, canDelete: boolean, locale: string): MessageButton {
	return new MessageButton({
		style: Constants.MessageButtonStyles.DANGER,
		customId: generateIncidentButtonId(OpCodes.DELETE, incidentId),
		label: i18next.t('buttons.labels.delete', {
			lng: locale,
		})!,
		disabled: !canDelete,
	});
}

export function reviewButton(incidentId: number, locale: string): MessageButton {
	return new MessageButton({
		style: Constants.MessageButtonStyles.SECONDARY,
		customId: generateIncidentButtonId(OpCodes.REVIEW, incidentId),
		label: i18next.t('buttons.labels.review', {
			lng: locale,
		})!,
	});
}

export function linkButton(url: string, locale: string): MessageButton {
	return new MessageButton({
		style: Constants.MessageButtonStyles.LINK,
		label: i18next.t('buttons.labels.link', {
			lng: locale,
		})!,
		url,
	});
}
