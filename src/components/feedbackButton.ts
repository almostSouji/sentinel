import { MessageComponentInteraction, MessageActionRow, DMChannel, MessageSelectMenu, MessageEmbed } from 'discord.js';
import i18next from 'i18next';
import { logger } from '../utils/logger';
import { GuildSettingFlags, GuildSettings, Incident, PerspectiveFeedback } from '../types/DataTypes';
import { generateIncidentButtonId, truncateEmbed } from '../utils';
import { OpCodes } from '..';
import { mapKeyToVerbose } from '../functions/formatting/formatPerspective';
import { COLOR_DARK, EMOJI_ID_SHIELD_GREEN_SMALL, EMOJI_ID_SHIELD_RED_SMALL } from '../utils/constants';

import { replyWithError } from '../utils/responses';
import { forcedAttributes, perspectiveAttributes } from '../functions/inspection/perspective';

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

	const settingAttributes = settings.flags.includes(GuildSettingFlags.LOG_ALL)
		? perspectiveAttributes
		: [...settings.attributes, ...forcedAttributes];

	const possible = [...new Set([...settings.attributes, ...settingAttributes])];

	const row = new MessageActionRow();
	const menu = new MessageSelectMenu()
		.setCustomId(generateIncidentButtonId(OpCodes.PERSPECTIVE_FEEDBACK, incident.id))
		.setPlaceholder(i18next.t('buttons.placeholder_perspective_feedback', { lng }))
		.setMinValues(0)
		.setMaxValues(possible.length)
		.addOptions(
			possible.map((p) => ({
				value: p,
				label: mapKeyToVerbose(p, settings.locale).toLowerCase(),
				emoji: incident.attributes.includes(p) ? EMOJI_ID_SHIELD_GREEN_SMALL : EMOJI_ID_SHIELD_RED_SMALL,
				default: incident.attributes.includes(p),
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
