import { MessageComponentInteraction, GuildMember, MessageActionRow, MessageEmbed, User } from 'discord.js';
import i18next from 'i18next';
import { OpCodes } from '..';
import { ERROR_CODE_MISSING_PERMISSIONS, ERROR_CODE_UNKNOWN_USER } from '../utils/constants';
import { clearButtons, flipButtons } from '../functions/buttons';
import { logger } from '../utils/logger';
import { GuildSettings, Incident, IncidentResolvedBy } from '../types/DataTypes';
import { truncateEmbed } from '../utils';

export async function handleBanButton(
	interaction: MessageComponentInteraction,
	settings: GuildSettings,
	incident: Incident,
) {
	const lng = settings.locale;
	const targetUserId = incident.user;
	const {
		client: { sql },
	} = interaction;

	const embed = new MessageEmbed(interaction.message.embeds[0] as MessageEmbed | undefined);
	try {
		const user = await interaction.guild?.members.ban(targetUserId, {
			days: 1,
			reason: i18next.t('buttons.button_action_reason', {
				executor: `${interaction.user.tag} (${interaction.user.id})`,
				lng,
			}),
		});
		// + successful ban
		embed
			.setFooter(
				i18next.t('buttons.ban_success', {
					executor: interaction.user.tag,
					target: user instanceof GuildMember ? user.user.tag : user instanceof User ? user.tag : user,
					lng,
				}),
				interaction.user.displayAvatarURL(),
			)
			.setTimestamp();

		await sql`update incidents set resolvedby = ${IncidentResolvedBy.BUTTON_BAN}, resolvedat = now() where id = ${incident.id}`;
		const newRows = clearButtons(interaction.message.components as MessageActionRow[]);
		const content = interaction.message.content.length ? interaction.message.content : null;

		await interaction.update({
			content: content,
			components: newRows,
			embeds: [truncateEmbed(embed)],
		});
	} catch (error) {
		// - ban failed
		const errorMsg =
			error.code === ERROR_CODE_MISSING_PERMISSIONS
				? i18next.t('buttons.ban_missing_permissions', {
						executor: interaction.user.tag,
						target: targetUserId,
						lng,
				  })
				: error.code === ERROR_CODE_UNKNOWN_USER
				? i18next.t('buttons.ban_unknown_user', {
						executor: interaction.user.tag,
						target: targetUserId,
						lng,
				  })
				: i18next.t('buttons.ban_unsuccessful', {
						executor: interaction.user.tag,
						target: targetUserId,
						lng,
				  });

		embed.setFooter(errorMsg, interaction.user.displayAvatarURL()).setTimestamp();
		const newRows =
			error.code === ERROR_CODE_UNKNOWN_USER
				? clearButtons(interaction.message.components as MessageActionRow[], [OpCodes.BAN])
				: error.code === ERROR_CODE_MISSING_PERMISSIONS
				? flipButtons(interaction.message.components as MessageActionRow[], [], [OpCodes.BAN])
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
