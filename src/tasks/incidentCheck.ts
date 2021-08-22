import { MessageActionRow, MessageButton, Client, MessageEmbed } from 'discord.js';
import { logger } from '../utils/logger';
import { GuildSettings, Incident, IncidentResolvedBy } from '../types/DataTypes';
import { fetchLog } from '../logState/fetchLog';
import i18next from 'i18next';
import { truncateEmbed } from '../utils';

export async function incidentCheck(client: Client) {
	const { sql } = client;

	const now = new Date();
	const incidents = await sql<Incident[]>`select * from incidents where resolvedby is null and expiresat <= ${now}`;
	await sql`update incidents set resolvedby = ${IncidentResolvedBy.ACTION_EXPIRED} where resolvedby is null and expiresat <= ${now}`;
	if (incidents.length) {
		logger.debug({
			msg: 'incidents resolved',
			incidents: incidents.map((i) => i.id),
			reason: IncidentResolvedBy.ACTION_EXPIRED,
		});
	}

	for (const incident of incidents) {
		const logMessage = await fetchLog(client, incident.logchannel, incident.logmessage);
		if (!logMessage) return;

		const rows: MessageActionRow[] = [];
		for (const row of logMessage.components) {
			const newRow = new MessageActionRow().addComponents(
				row.components.filter((c) => {
					if (!(c instanceof MessageButton)) return true;
					if (!c.customId) return true;
					return false;
				}),
			);
			if (newRow.components.length) {
				rows.push(newRow);
			}
		}

		const [settings] = await sql<GuildSettings[]>`select * from guild_settings where guild = ${incident.guild}`;
		if (!settings) return;

		const embed = new MessageEmbed(logMessage.embeds[0])
			.setFooter(
				i18next.t('logstate.expired', {
					lng: settings.locale,
				}),
				client.user!.displayAvatarURL(),
			)
			.setTimestamp();

		await logMessage.edit({
			components: rows,
			embeds: [truncateEmbed(embed)],
		});
	}
}
