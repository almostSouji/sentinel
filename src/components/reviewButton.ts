import { MessageComponentInteraction, MessageActionRow, MessageEmbed, DMChannel } from 'discord.js';
import i18next from 'i18next';
import { clearButtons } from '../functions/buttons';
import { logger } from '../utils/logger';
import { GuildSettings, Incident, IncidentResolvedBy } from '../types/DataTypes';
import { truncateEmbed } from '../utils';

export async function handleReviewButton(
	interaction: MessageComponentInteraction,
	settings: GuildSettings,
	incident: Incident,
) {
	const lng = settings.locale;
	const {
		client: { sql },
	} = interaction;

	if (!interaction.channel || interaction.channel instanceof DMChannel || interaction.channel.partial) return;

	const embed = new MessageEmbed(interaction.message.embeds[0] as MessageEmbed | undefined);
	try {
		// + successful review
		embed
			.setFooter(
				i18next.t('buttons.reviewed', {
					executor: interaction.user.tag,
					lng,
				}),
				interaction.user.displayAvatarURL(),
			)
			.setTimestamp();

		await sql`
			update incidents set
				resolvedby = ${IncidentResolvedBy.BUTTON_REVIEW},
				resolvedat = now(),
				resolvedbyuser = ${interaction.user.id}
			where id = ${incident.id}`;
		const newRows = clearButtons(interaction.message.components as MessageActionRow[]);
		const content = interaction.message.content.length ? interaction.message.content : null;
		await interaction.update({
			content,
			components: newRows,
			embeds: [truncateEmbed(embed)],
		});
	} catch (error: any) {
		logger.error(error, error.message);
	}
}
