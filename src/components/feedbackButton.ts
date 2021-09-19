import { MessageComponentInteraction, MessageActionRow, DMChannel, MessageSelectMenu, MessageEmbed } from 'discord.js';
import i18next from 'i18next';
import { logger } from '../utils/logger';
import { GuildSettings, Incident, PerspectiveFeedback } from '../types/DataTypes';
import { generateIncidentButtonId, truncateEmbed } from '../utils';
import { OpCodes } from '..';
import { mapKeyToVerbose } from '../functions/formatting/formatPerspective';
import { COLOR_DARK, EMOJI_ID_SHIELD_RED_SMALL, EMOJI_ID_SHIELD_YELLOW_SMALL } from '../utils/constants';
import { forcedAttributes } from '../functions/inspection/perspective';
import { replyWithError } from '../utils/responses';

export async function handleFeedbackButton(
	interaction: MessageComponentInteraction,
	settings: GuildSettings,
	incident: Incident,
) {
	const lng = settings.locale;
	const {
		client: { sql },
	} = interaction;

	if (!interaction.channel || interaction.channel instanceof DMChannel || interaction.channel.partial) return;

	const [feedbackEntry] = await sql<
		PerspectiveFeedback[]
	>`select * from perspectivefeedback where "user" = ${interaction.user.id} and incident = ${incident.id}`;

	if (feedbackEntry) {
		return replyWithError(interaction, i18next.t('buttons.perspective_feedback_already', { lng }));
	}

	const row = new MessageActionRow();
	const menu = new MessageSelectMenu()
		.setCustomId(generateIncidentButtonId(OpCodes.PERSPECTIVE_FEEDBACK, incident.id))
		.setPlaceholder(i18next.t('buttons.placeholder_perspective_feedback', { lng }))
		.setMaxValues(incident.attributes.length)
		.addOptions(
			incident.attributes.map((p) => ({
				value: p,
				label: i18next.t('buttons.perspective_feedback_entry', {
					lng: settings.locale,
					attribute: mapKeyToVerbose(p, settings.locale).toLowerCase(),
				}),
				emoji: forcedAttributes.includes(p) ? EMOJI_ID_SHIELD_RED_SMALL : EMOJI_ID_SHIELD_YELLOW_SMALL,
			})),
		);

	row.addComponents(menu);

	const embed = new MessageEmbed(interaction.message.embeds[0] as MessageEmbed)
		.setFields([])
		.setFooter('', undefined)
		.setColor(COLOR_DARK);
	embed.timestamp = null;

	try {
		// + send feedback select menu
		return await interaction.reply({
			content: i18next.t('select.feedback_explanation', {
				lng: settings.locale,
			}),
			embeds: [truncateEmbed(embed)],
			components: [row],
			ephemeral: true,
		});
	} catch (error: any) {
		logger.error(error, error.message);
	}
}
