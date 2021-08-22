import { Constants, MessageActionRow, MessageButton } from 'discord.js';
import i18next from 'i18next';
import { OpCodes } from '..';
import { destructureIncidentButtonId, generateIncidentButtonId } from '../utils';

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

/**
 * Clear provided rows from buttons with certain OP codes.
 * Link buttons and non-buttons are not cleared.
 * @param rows - Rows to consider
 * @param ops - OP codes to clear
 * @returns The cleared rows
 */
export function clearButtons(
	rows: MessageActionRow[],
	ops = [OpCodes.BAN, OpCodes.DELETE, OpCodes.REVIEW],
): MessageActionRow[] {
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

export function flipButtons(rows: MessageActionRow[], opsEnable: OpCodes[], opsDisable: OpCodes[]): MessageActionRow[] {
	const newRows: MessageActionRow[] = [];
	for (const row of rows) {
		const newRow = new MessageActionRow();
		for (const component of row.components) {
			if (!component.customId) {
				newRow.addComponents(component);
				continue;
			}
			const [op] = destructureIncidentButtonId(component.customId);
			newRow.addComponents(
				component.setDisabled(opsEnable.includes(op) ? true : opsDisable.includes(op) ? false : component.disabled),
			);
			continue;
		}
		if (newRow.components.length) newRows.push(newRow);
	}
	return newRows;
}
