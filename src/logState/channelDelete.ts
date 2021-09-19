import { Client, GuildChannel } from 'discord.js';
import { logger } from '../utils/logger';
import { Incident, IncidentResolvedBy } from '../types/DataTypes';

export async function handleChannelDeleteLogstate(client: Client, channel: GuildChannel) {
	const { sql } = client;
	const incidents = await sql<Incident[]>`select * from incidents where channel = ${channel.id} and resolvedby is null`;

	if (incidents.length) {
		//* deleted channel is logchannel
		//* resolve incidents
		await sql`update incidents set resolvedby = ${IncidentResolvedBy.LOGCHANNEL_DELETED}, resolvedat = now() where logchannel = ${channel.id} and resolvedby is null`;
		logger.debug({
			msg: 'incidents resolved',
			incidents: incidents.map((i) => i.id),
			reason: IncidentResolvedBy.LOGCHANNEL_DELETED,
		});
	}
}
