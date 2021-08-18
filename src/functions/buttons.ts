import { MessageButton } from 'discord.js';
import i18next from 'i18next';
import { OpCodes } from '..';
import { generateIncidentButtonId } from '../utils';

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

export function banButton(incidentId: number, canBan: boolean, locale: string): MessageButton {
	return new MessageButton({
		type: 2,
		style: 4,
		customId: generateIncidentButtonId(OpCodes.BAN, incidentId),
		label: i18next.t('buttons.labels.ban', {
			lng: locale,
		})!,
		disabled: !canBan,
	});
}

export function deleteButton(incidentId: number, canDelete: boolean, locale: string): MessageButton {
	return new MessageButton({
		type: 2,
		style: 4,
		customId: generateIncidentButtonId(OpCodes.DELETE, incidentId),
		label: i18next.t('buttons.labels.delete', {
			lng: locale,
		})!,
		disabled: !canDelete,
	});
}

export function reviewButton(incidentId: number, locale: string): MessageButton {
	return new MessageButton({
		type: 2,
		style: 1,
		customId: generateIncidentButtonId(OpCodes.REVIEW, incidentId),
		label: i18next.t('buttons.labels.review', {
			lng: locale,
		})!,
	});
}
