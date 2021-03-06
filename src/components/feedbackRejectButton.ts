import { MessageComponentInteraction, MessageActionRow, MessageEmbed } from 'discord.js';
import i18next from 'i18next';
import { clearButtons } from '../functions/buttons';
import { logger } from '../utils/logger';
import { GuildSettings, PerspectiveFeedback } from '../types/DataTypes';
import { truncateEmbed } from '../utils';
import { replyWithError } from '../utils/responses';
import { inlineCode } from '@discordjs/builders';
import { OpCodes } from '..';
import { COLOR_DISCORD_DANGER } from '../utils/constants';

export async function handleFeedbackRejectButton(
	interaction: MessageComponentInteraction,
	settings: GuildSettings,
	feedbackId: number,
) {
	const lng = settings.locale;
	const {
		client: { sql },
	} = interaction;

	const [feedbackEntry] = await sql<PerspectiveFeedback[]>`select * from perspectivefeedback where id = ${feedbackId}`;

	if (!feedbackEntry) {
		return replyWithError(
			interaction,
			i18next.t('buttons.perspective_feedback_none', {
				lng: settings.locale,
				id: inlineCode(String(feedbackId)),
			}),
		);
	}

	const embed = new MessageEmbed(interaction.message.embeds[0] as MessageEmbed | undefined);
	try {
		// + rejection
		embed
			.setFooter(
				i18next.t('buttons.perspective_feedback_rejected', {
					executor: interaction.user.tag,
					lng,
				}),
				interaction.user.displayAvatarURL(),
			)
			.setTimestamp()
			.setColor(COLOR_DISCORD_DANGER);

		await sql`update perspectivefeedback set approved = false, reviewedat = now() where id = ${feedbackId}`;
		const newRows = clearButtons(interaction.message.components as MessageActionRow[], [
			OpCodes.PERSPECTIVE_FEEDBACK_ACCEPT,
			OpCodes.PERSPECTIVE_FEEDBACK_REJECT,
		]);

		await interaction.update({
			components: newRows,
			embeds: [truncateEmbed(embed)],
		});
	} catch (error: any) {
		logger.error(error, error.message);
	}
}
