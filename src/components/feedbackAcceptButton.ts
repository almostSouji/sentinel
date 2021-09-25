import { MessageComponentInteraction, MessageActionRow, MessageEmbed } from 'discord.js';
import i18next from 'i18next';
import { clearButtons } from '../functions/buttons';
import { logger } from '../utils/logger';
import { GuildSettings, Incident, PerspectiveFeedback } from '../types/DataTypes';
import { truncateEmbed } from '../utils';
import { replyWithError } from '../utils/responses';
import { inlineCode } from '@discordjs/builders';
import { OpCodes } from '..';
import { feedback } from '../functions/inspection/perspective';
import { COLOR_DISCORD_SUCCESS } from '../utils/constants';
import { PerspectiveAttribute } from '../types/perspective';

export async function handleFeedbackAcceptButton(
	interaction: MessageComponentInteraction,
	settings: GuildSettings,
	feedbackId: number,
) {
	const lng = settings.locale;
	const {
		client: { sql },
	} = interaction;

	const [feedbackEntry] = await sql<PerspectiveFeedback[]>`select * from perspectivefeedback where id = ${feedbackId}`;
	const [incidentEntry] = await sql<Incident[]>`select * from incidents where id = ${feedbackEntry.incident}`;

	if (!feedbackEntry || !incidentEntry) {
		return replyWithError(
			interaction,
			i18next.t('buttons.perspective_feedback_none', {
				lng: settings.locale,
				id: inlineCode(String(feedbackId)),
			}),
		);
	}

	const possible = [...new Set([...feedbackEntry.suggested, ...incidentEntry.attributes])];

	const shouldBeFlagged: PerspectiveAttribute[] = [];
	const shouldNotBeFlagged: PerspectiveAttribute[] = [];

	for (const flag of possible) {
		const inOld = incidentEntry.attributes.includes(flag);
		const inNew = feedbackEntry.suggested.includes(flag as PerspectiveAttribute);

		if (!inOld && inNew) {
			shouldBeFlagged.push(flag as PerspectiveAttribute);
		}

		if (inOld && !inNew) {
			shouldNotBeFlagged.push(flag as PerspectiveAttribute);
		}
	}

	const embed = new MessageEmbed(interaction.message.embeds[0] as MessageEmbed | undefined);
	try {
		await interaction.deferUpdate();
		try {
			await feedback(feedbackEntry.content, shouldBeFlagged, shouldNotBeFlagged, feedbackEntry.guild ?? 'global');
		} catch (error: any) {
			logger.error(error, error.message);
			return replyWithError(
				interaction,
				i18next.t('buttons.perspective_feedback_error', {
					lng,
				}),
			);
		}
		// + approval
		embed
			.setFooter(
				i18next.t('buttons.perspective_feedback_approved', {
					executor: interaction.user.tag,
					lng,
				}),
				interaction.user.displayAvatarURL(),
			)
			.setTimestamp()
			.setColor(COLOR_DISCORD_SUCCESS);

		await sql`update perspectivefeedback set approved = true, reviewedat = now() where id = ${feedbackId}`;
		const newRows = clearButtons(interaction.message.components as MessageActionRow[], [
			OpCodes.PERSPECTIVE_FEEDBACK_ACCEPT,
			OpCodes.PERSPECTIVE_FEEDBACK_REJECT,
		]);

		await interaction.editReply({
			components: newRows,
			embeds: [truncateEmbed(embed)],
		});
	} catch (error: any) {
		logger.error(error, error.message);
	}
}
