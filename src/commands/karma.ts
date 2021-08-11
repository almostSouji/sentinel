import { MessageEmbed, CommandInteraction, DMChannel } from 'discord.js';
import i18next from 'i18next';
import { COLOR_DARK, LIST_BULLET } from '../constants';
import { KarmaCommand } from '../interactions/karma';
import { ArgumentsOf } from '../types/ArgumentsOf';
import { Incident, UserStats } from '../types/DataTypes';
import { truncateEmbed } from '../utils';
import { replyWithError } from '../utils/responses';
import { userMention, inlineCode } from '@discordjs/builders';

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
	const [stats] = await sql<UserStats[]>`select * from users where "user" = ${targetUser.id}`;

	if (!stats || !incidents.length) {
		return replyWithError(
			interaction,
			i18next.t('command.karma.no_data', { lng: locale, user: userMention(targetUser.id) }),
		);
	}

	const attributesFormatted = [];
	const flagCounts = new Map<string, number>();
	for (const incident of incidents) {
		for (const attribute of incident.attributes) {
			const current = flagCounts.get(attribute) ?? 0;
			flagCounts.set(attribute, current + 1);
		}
	}

	for (const [key, value] of [...flagCounts.entries()].sort((a, b) => b[1] - a[1])) {
		attributesFormatted.push(`${LIST_BULLET} ${value}x ${inlineCode(key)}`);
	}

	void interaction.reply({
		embeds: [
			truncateEmbed(
				new MessageEmbed()
					.addField(
						i18next.t('command.karma.karma_fieldname', { lng: locale }),
						i18next.t('command.karma.karma_message', {
							lng: locale,
							numtripped: incidents.length,
							numtotal: stats.messages,
							numflags: [...flagCounts.values()].reduce((a, c) => a + c, 0),
						}),
					)
					.addField(
						i18next.t('command.karma.attributes_fieldname', { lng: locale }),
						`${attributesFormatted.join('\n')}`,
					)
					.setAuthor(`${targetUser.tag} (${targetUser.id})`, targetUser.displayAvatarURL())
					.setColor(COLOR_DARK),
			),
		],
		ephemeral: true,
	});
}
