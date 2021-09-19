import { Client, GuildBan, MessageEmbed } from 'discord.js';
import i18next from 'i18next';
import { logger } from '../utils/logger';
import { GuildSettings, Incident, IncidentResolvedBy } from '../types/DataTypes';
import { truncateEmbed } from '../utils';
import { fetchLog } from './fetchLog';

export async function handleGuildBanAddLogstate(client: Client, ban: GuildBan) {
	const { sql } = client;
	const incidents = await sql<Incident[]>`select * from incidents where "user" = ${ban.user.id} and resolvedby is null`;
	const [settings] = await sql<GuildSettings[]>`select * from guild_settings where guild = ${ban.guild.id}`;
	if (!settings || !incidents.length) return;
	await sql`update incidents set resolvedby = ${IncidentResolvedBy.GUILD_MEMBER_BAN}, resolvedat = now() where "user" =  ${ban.user.id} and resolvedby is null`;
	logger.debug({
		msg: 'incidents resolved',
		incidents: incidents.map((i) => i.id),
		reason: IncidentResolvedBy.GUILD_MEMBER_BAN,
	});

	for (const incident of incidents) {
		const logMessage = await fetchLog(client, incident.logchannel, incident.logmessage);
		if (!logMessage) return;

		const embed = new MessageEmbed(logMessage.embeds[0])
			.setFooter(
				i18next.t('logstate.ban', {
					lng: settings.locale,
				}),
				client.user!.displayAvatarURL(),
			)
			.setTimestamp();
		await logMessage.edit({
			components: logMessage.components,
			embeds: [truncateEmbed(embed)],
		});
	}
}
