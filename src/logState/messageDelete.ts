import { Client, Message } from 'discord.js';
import { logger } from '../utils/logger';
import { Incident, IncidentResolvedBy } from '../types/DataTypes';

export async function handleMessageDeleteLogstate(client: Client, message: Message) {
	const { sql } = client;
	const incident = (
		await sql<Incident[]>`select * from incidents where message = ${message.id} and resolvedby is null`
	)[0];
	if (!incident) return;
	if (incident.logmessage === message.id) {
		//* deleted message is logmessage
		//* resolve the log
		await sql`update incidents set resolvedby = ${IncidentResolvedBy.LOGMESSAGE_DELETED}, resolvedat = now() where logmessage = ${message.id}`;
		logger.debug({
			msg: 'incident resolved',
			incident: incident.id,
			reason: IncidentResolvedBy.LOGMESSAGE_DELETED,
		});
	}
}
