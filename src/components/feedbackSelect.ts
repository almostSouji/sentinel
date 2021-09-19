import { inlineCode } from '@discordjs/builders';
import { MessageActionRow, MessageEmbed, SelectMenuInteraction, TextChannel } from 'discord.js';
import i18next from 'i18next';
import { feedbackAcceptButton, feedbackRejectButton } from '../functions/buttons';
import { GuildSettings, PerspectiveFeedback } from '../types/DataTypes';
import { truncateEmbed } from '../utils';
import { COLOR_DARK, LIST_BULLET } from '../utils/constants';
import { logger } from '../utils/logger';
import { replyWithError } from '../utils/responses';

export async function handleFeedbackSelect(
	interaction: SelectMenuInteraction,
	incidentId: number,
	settings: GuildSettings,
) {
	const {
		client: { sql },
		client,
	} = interaction;
	try {
		const channel = interaction.client.channels.resolve(process.env.PERSPECTIVE_FEEDBACK_CHANNEL!) as TextChannel;
		const feedback = await sql<
			PerspectiveFeedback[]
		>`select * from perspectivefeedback where incident = ${incidentId} and "user" = ${interaction.user.id}`;

		if (feedback.length) {
			return replyWithError(interaction, i18next.t('buttons.perspective_feedback_already', { lng: settings.locale }));
		}

		const nextFeedbackId = await client.incrFeedback();

		await sql`
			insert into perspectivefeedback (
				id,
				incident,
				"user",
				content,
				guild,
				wrongattributes
			) values (
				${nextFeedbackId},
				${incidentId},
				${interaction.user.id},
				${interaction.message.embeds[0].description!},
				${interaction.guild?.id ?? null},
				${sql.array(interaction.values)}
			)
		`;

		const embed = new MessageEmbed()
			.setAuthor(
				i18next.t('select.feedback_correction_by', {
					lng: settings.locale,
					user: `${interaction.user.tag} (${interaction.user.id})`,
				}),
				interaction.user.displayAvatarURL(),
			)
			.setDescription(interaction.message.embeds[0]?.description ?? 'none')
			.addField(
				i18next.t('select.feedback_wrong_attributes_fieldtitle', {
					lng: settings.locale,
					count: interaction.values.length,
				}),
				interaction.values.map((v) => `${LIST_BULLET} ${inlineCode(v)}`).join('\n'),
			)
			.setColor(COLOR_DARK);

		await channel.send({
			embeds: [truncateEmbed(embed)],
			components: [
				new MessageActionRow().addComponents(
					feedbackRejectButton(nextFeedbackId, settings.locale),
					feedbackAcceptButton(nextFeedbackId, settings.locale),
				),
			],
		});

		await interaction.update({
			content: i18next.t('buttons.perspective_feedback_success', { lng: settings.locale }),
			embeds: [],
			components: [],
		});
	} catch (error: any) {
		logger.error(error, error.message);
	}
}
