import { MessageEmbed, CommandInteraction, DMChannel } from 'discord.js';
import i18next from 'i18next';
import { COLOR_DARK, LIST_BULLET } from '../constants';
import { KarmaCommand } from '../interactions/karma';
import { ArgumentsOf } from '../types/ArgumentsOf';
import { GuildSettings, Incident, UserStats } from '../types/DataTypes';
import { truncateEmbed } from '../utils';
import { replyWithError } from '../utils/responses';
import { userMention, inlineCode } from '@discordjs/builders';
import { formatSeverity } from '../utils/formatting';

export async function handleKarmaCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof KarmaCommand>,
	locale: string,
) {
	const {
		client: { sql },
		guild,
		channel,
	} = interaction;

	if (!channel || channel.partial) {
		return;
	}

	if (!guild || channel instanceof DMChannel) {
		return replyWithError(interaction, i18next.t('common.errors.not_in_dm', { lng: locale }));
	}

	const targetUser = args.user?.user ?? interaction.options.getUser('user');
	if (!targetUser) {
		return replyWithError(interaction, i18next.t('command.karma.no_user', { lng: locale }));
	}
	const incidents = await sql<
		Incident[]
	>`select * from incidents where guild = ${guild.id} and author = ${targetUser.id}`;
	const [stats] = await sql<UserStats[]>`select * from users where "user" = ${targetUser.id} and guild = ${guild.id}`;

	const [settings] = await sql<GuildSettings[]>`select * from guild_settings where guild = ${guild.id}`;

	if (!stats || !incidents.length) {
		return replyWithError(
			interaction,
			i18next.t('command.karma.no_data', { lng: locale, user: userMention(targetUser.id) }),
		);
	}

	const attributesFormatted = [];
	const severityFormatted = [];
	const flagCounts = new Map<string, number>();
	const severityCounts = new Map<number, number>();

	for (const incident of incidents) {
		const currentSeverityNumber = severityCounts.get(incident.severity) ?? 0;
		severityCounts.set(incident.severity, currentSeverityNumber + 1);
		for (const attribute of incident.attributes) {
			const current = flagCounts.get(attribute) ?? 0;
			flagCounts.set(attribute, current + 1);
		}
	}

	for (const [key, value] of [...severityCounts.entries()].sort((a, b) => b[0] - a[0])) {
		severityFormatted.push(`${LIST_BULLET} ${value}x ${formatSeverity(channel, key)}`);
	}
	for (const [key, value] of [...flagCounts.entries()].sort((a, b) => b[1] - a[1])) {
		attributesFormatted.push(`${LIST_BULLET} ${value}x ${inlineCode(key)}`);
	}

	const embed = new MessageEmbed()
		.addField(
			i18next.t('command.karma.karma_fieldname', { lng: locale }),
			i18next.t('command.karma.karma_message', {
				lng: locale,
				numtripped: incidents.length,
				numtotal: stats.messages,
				numflags: [...flagCounts.values()].reduce((a, c) => a + c, 0),
			}),
		)
		.addField(i18next.t('command.karma.attributes_fieldname', { lng: locale }), attributesFormatted.join('\n'), true)
		.addField(i18next.t('command.karma.severity_fieldname', { lng: locale }), severityFormatted.join('\n'), true)
		.setAuthor(`${targetUser.tag} (${targetUser.id})`, targetUser.displayAvatarURL())
		.setColor(COLOR_DARK);

	if (settings?.spamthreshold && stats.antispam) {
		embed.addField(i18next.t('command.karma.spam_fieldname', { lng: locale }), String(stats.antispam), true);
	}

	void interaction.reply({
		embeds: [truncateEmbed(embed)],
		ephemeral: true,
	});
}
