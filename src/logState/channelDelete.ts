import { Client, GuildChannel, MessageActionRow, MessageButton } from 'discord.js';
import { OpCodes } from '..';
import { logger } from '../functions/logger';
import { Incident, IncidentResolvedBy } from '../types/DataTypes';
import { destructureIncidentButtonId } from '../utils';
import { fetchLog } from './fetchLog';

export async function handleChannelDeleteLogstate(client: Client, channel: GuildChannel) {
	const { sql } = client;
	const incidents = await sql<
		Incident[]
	>`select * from incidents where (channel = ${channel.id} or logchannel = ${channel.id}) and resolvedby is null`;

	if (!incidents.length) return;

	const logChannelIncidents = [];
	const incidentChannelIncidents = [];

	for (const incident of incidents) {
		if (incident.logchannel === channel.id) {
			logChannelIncidents.push(incident);
		} else if (incident.channel === channel.id) {
			incidentChannelIncidents.push(incident);
		}
	}

	if (logChannelIncidents.length) {
		//* deleted channel is logchannel
		//* resolve incidents
		await sql`update incidents set resolvedby = ${IncidentResolvedBy.LOGCHANNEL_DELETED} where logchannel = ${channel.id} and resolvedby is null`;
		logger.debug({
			msg: 'incidents resolved',
			incidents: logChannelIncidents.map((i) => i.id),
			reason: IncidentResolvedBy.LOGCHANNEL_DELETED,
		});
	}

	for (const incident of incidentChannelIncidents) {
		//* deleted channel is incident channel
		//* resolve the log
		const logMessage = await fetchLog(client, incident.logchannel, incident.logmessage);
		if (!logMessage) return;

		//* remove deleted button, if present
		const rows: MessageActionRow[] = [];
		for (const row of logMessage.components) {
			const newRow = new MessageActionRow().addComponents(
				row.components.filter((c) => {
					if (!(c instanceof MessageButton)) return true;
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
		//* incident channel deleted is only relevant for delete button, not resolved
	}
}
