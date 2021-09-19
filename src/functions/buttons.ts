import { Constants, MessageActionRow, MessageButton } from 'discord.js';
import i18next from 'i18next';
import { OpCodes } from '..';
import { destructureIncidentButtonId, generateIncidentButtonId } from '../utils';
import { EMOJI_ID_PERSPECTIVE } from '../utils/constants';

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

export function feedbackAcceptButton(incidentId: number, locale: string): MessageButton {
	return new MessageButton({
		style: Constants.MessageButtonStyles.SUCCESS,
		customId: generateIncidentButtonId(OpCodes.PERSPECTIVE_FEEDBACK_ACCEPT, incidentId),
		label: i18next.t('buttons.labels.accept', {
			lng: locale,
		})!,
	});
}

export function feedbackRejectButton(incidentId: number, locale: string): MessageButton {
	return new MessageButton({
		style: Constants.MessageButtonStyles.DANGER,
		customId: generateIncidentButtonId(OpCodes.PERSPECTIVE_FEEDBACK_REJECT, incidentId),
		label: i18next.t('buttons.labels.reject', {
			lng: locale,
		})!,
	});
}

export function feedbackButton(incidentId: number): MessageButton {
	return new MessageButton({
		style: Constants.MessageButtonStyles.SECONDARY,
		customId: generateIncidentButtonId(OpCodes.PERSPECTIVE_FEEDBACK_BUTTON, incidentId),
		emoji: EMOJI_ID_PERSPECTIVE,
	});
}

/**
 * Clear provided rows from buttons with certain OP codes.
 * Link buttons and non-buttons are not cleared.
 * @param rows - Rows to consider
 * @param ops - OP codes to clear
 * @returns The cleared rows
 */
export function clearButtons(rows: MessageActionRow[], ops = [OpCodes.REVIEW]): MessageActionRow[] {
	const newRows: MessageActionRow[] = [];
	for (const row of rows) {
		const newRow = new MessageActionRow();
		for (const component of row.components) {
			if (!component.customId) {
				newRow.addComponents(component);
				continue;
			}
			const [op] = destructureIncidentButtonId(component.customId);
			if (ops.includes(op)) continue;
			newRow.addComponents(component);
		}
		if (newRow.components.length) newRows.push(newRow);
	}
	return newRows;
}
