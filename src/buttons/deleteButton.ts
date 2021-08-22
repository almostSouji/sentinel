import { MessageComponentInteraction, GuildMember, MessageActionRow, MessageEmbed } from 'discord.js';
import i18next from 'i18next';
import { OpCodes } from '..';
import { ERROR_CODE_MISSING_PERMISSIONS, ERROR_CODE_UNKNOWN_MESSAGE } from '../utils/constants';
import { clearButtons, flipButtons } from '../functions/buttons';
import { logger } from '../utils/logger';
import { GuildSettings, Incident, IncidentResolvedBy } from '../types/DataTypes';
import { truncateEmbed } from '../utils';

export async function handleDeleteButton(
	interaction: MessageComponentInteraction,
	settings: GuildSettings,
	incident: Incident,
) {
	const lng = settings.locale;
	const {
		client: { sql, user: clientUser },
	} = interaction;

	if (!(interaction.member instanceof GuildMember) || !interaction.guild || !clientUser) return;

	const incidentChannel = interaction.guild.channels.resolve(incident.channel ?? '');

	if (!incidentChannel || !incidentChannel.isText()) return;

	const embed = new MessageEmbed(interaction.message.embeds[0] as MessageEmbed | undefined);
	try {
		await incidentChannel.messages.delete(incident.message ?? '');
		// + successful deletion
		embed
			.setFooter(
				i18next.t('buttons.delete_success', {
					executor: interaction.user.tag,
					lng,
				}),
				interaction.user.displayAvatarURL(),
			)
			.setTimestamp();

		await sql`
			update incidents set
				resolvedby = ${IncidentResolvedBy.BUTTON_DELETE},
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
	} catch (error) {
		// - message deletion failed
		const errorMsg =
			error.code === ERROR_CODE_UNKNOWN_MESSAGE
				? i18next.t('buttons.delete_unknown_message', {
						executor: interaction.user.tag,
						lng,
				  })
				: error.code === ERROR_CODE_MISSING_PERMISSIONS
				? i18next.t('buttons.delete_missing_permissions', {
						executor: interaction.user.tag,
						lng,
				  })
				: i18next.t('buttons.delete_unsuccessful', {
						executor: interaction.user.tag,
						lng,
				  });

		embed.setFooter(errorMsg, interaction.user.displayAvatarURL()).setTimestamp();
		const newRows =
			error.code === ERROR_CODE_UNKNOWN_MESSAGE
				? clearButtons(interaction.message.components as MessageActionRow[], [OpCodes.DELETE])
				: error.code === ERROR_CODE_MISSING_PERMISSIONS
				? flipButtons(interaction.message.components as MessageActionRow[], [], [OpCodes.DELETE])
				: (interaction.message.components as MessageActionRow[]);

		try {
			const content = interaction.message.content.length ? interaction.message.content : null;

			await interaction.update({
				content,
				embeds: [truncateEmbed(embed)],
				components: newRows,
			});
		} catch (err) {
			logger.error(err);
		}
	}
}
