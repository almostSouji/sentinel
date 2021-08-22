import { Client, Message, MessageActionRow } from 'discord.js';
import { OpCodes } from '..';
import { logger } from '../utils/logger';
import { Incident, IncidentResolvedBy } from '../types/DataTypes';
import { destructureIncidentButtonId } from '../utils';
import { fetchLog } from './fetchLog';

export async function handleMessageDeleteLogstate(client: Client, message: Message) {
	const { sql } = client;
	const incident = (
		await sql<
			Incident[]
		>`select * from incidents where (message = ${message.id} or logmessage = ${message.id}) and resolvedby is null`
	)[0];
	if (!incident) return;
	if (incident.logmessage === message.id) {
		//* deleted message is logmessage
		//* resolve the log
		await sql`update incidents set resolvedby = ${IncidentResolvedBy.LOGMESSAGE_DELETED} where logmessage = ${message.id}`;
		logger.debug({
			msg: 'incident resolved',
			incident: incident.id,
			reason: IncidentResolvedBy.LOGMESSAGE_DELETED,
		});
	} else if (incident.message === message.id) {
		//* deleted message is incidentmessage
		//* attempt to fetch log
		const logMessage = await fetchLog(client, incident.logchannel, incident.logmessage);
		if (!logMessage) return;

		//* remove deleted button, if present
		const rows: MessageActionRow[] = [];
		for (const row of logMessage.components) {
			const newRow = new MessageActionRow().addComponents(
				row.components.filter((c) => {
					if (!c.customId) return true;
					const [op] = destructureIncidentButtonId(c.customId);
					if (isNaN(op)) return true;
					if (op !== OpCodes.DELETE) return true;
					return false;
				}),
			);
			if (newRow.components.length) {
				rows.push(newRow);
			}
		}

		await logMessage.edit({
			components: rows,
		});
		//* incident message deleted is only relevant for delete button, not resolved
	}
}
