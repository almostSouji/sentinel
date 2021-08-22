import { Client, GuildChannel, Message } from 'discord.js';
import { logger } from '../utils/logger';
import { IncidentResolvedBy } from '../types/DataTypes';

export async function fetchLog(
	client: Client,
	logChannelId: string | null,
	logMessageId: string | null,
): Promise<Message | null> {
	const { sql } = client;
	if (!logChannelId && !logMessageId) return null;
	if (!logChannelId || !logMessageId) {
		await sql`update incidents set resolvedby = ${IncidentResolvedBy.LOGCHANNEL_INVALID}, resolvedat = now() where (logmessage = ${logMessageId} or logchannel = ${logChannelId}) and resolvedby is null`;
		logger.debug({
			msg: 'incidents resolved',
			logChannel: logChannelId,
			logMessage: logMessageId,
			reason: IncidentResolvedBy.LEGACY,
		});
		return null;
	}
	const logChannel = client.channels.resolve(logChannelId);
	if (!logChannel || !(logChannel instanceof GuildChannel) || !logChannel.isText() || logChannel.isThread()) {
		await sql`update incidents set resolvedby = ${IncidentResolvedBy.LOGCHANNEL_INVALID}, resolvedat = now() where logchannel = ${logChannelId} and resolvedby is null`;
		logger.debug({
			msg: 'incidents resolved',
			channel: logChannelId,
			reason: IncidentResolvedBy.LOGCHANNEL_INVALID,
		});
		return null;
	}
	try {
		const logMessage = await logChannel.messages.fetch(logMessageId);
		return logMessage;
	} catch {
		await sql`update incidents set resolvedby = ${IncidentResolvedBy.LOGMESSAGE_DELETED}, resolvedat = now() where logmessage = ${logMessageId} and resolvedby is null`;
		logger.debug({
			msg: 'incident resolved',
			logMessage: logMessageId,
			reason: IncidentResolvedBy.LOGMESSAGE_DELETED,
		});
		return null;
	}
}
