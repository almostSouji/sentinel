import { inlineCode } from '@discordjs/builders';
import { MessageActionRow, MessageEmbed, SelectMenuInteraction, TextChannel } from 'discord.js';
import i18next from 'i18next';
import { feedbackAcceptButton, feedbackRejectButton } from '../functions/buttons';
import { GuildSettings, Incident, PerspectiveFeedback } from '../types/DataTypes';
import { arraysEqual, truncateEmbed } from '../utils';
import { COLOR_DARK, LIST_BULLET } from '../utils/constants';
import { logger } from '../utils/logger';
import { replyWithError } from '../utils/responses';

export async function handleFeedbackSelect(
	interaction: SelectMenuInteraction,
	incidentId: number,
	settings: GuildSettings,
) {
	const {
		client: { sql, guilds },
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

		const [incident] = await sql<Incident[]>`select * from incidents where id = ${incidentId}`;

		if (!incident) {
			return replyWithError(interaction, i18next.t('buttons.perspective_feedback_already', { lng: settings.locale }));
		}

		const targetGuild = guilds.resolve(settings.guild);

		const nextFeedbackId = await client.incrFeedback();

		await sql`
			insert into perspectivefeedback (
				id,
				incident,
				"user",
				content,
				guild,
				suggested
			) values (
				${nextFeedbackId},
				${incidentId},
				${interaction.user.id},
				${interaction.message.embeds[0].description!},
				${interaction.guild?.id ?? null},
				${sql.array(interaction.values)}
			)
		`;

		const before = incident.attributes.map((v) => `${LIST_BULLET} ${inlineCode(v)}`);
		const after = interaction.values.map((v) => `${LIST_BULLET} ${inlineCode(v)}`);

		if (arraysEqual(before, after)) {
			return replyWithError(interaction, i18next.t('buttons.perspective_feedback_already', { lng: settings.locale }));
		}

		const embed = new MessageEmbed()
			.setAuthor(
				i18next.t('select.feedback_correction_by', {
					lng: settings.locale,
					user: `${interaction.user.tag} (${interaction.user.id})`,
				}),
				interaction.user.displayAvatarURL(),
			)
			.setDescription(interaction.message.embeds[0]?.description ?? 'None')
			.addField(
				i18next.t('select.feedback_guild_fieldtitle', { lng: settings.locale }),
				`${targetGuild ? `${inlineCode(targetGuild.name)} ${inlineCode(targetGuild.id)}` : 'None'}`,
			)
			.addField(
				i18next.t('select.feedback_wrong_attributes_before_fieldtitle', {
					lng: settings.locale,
					count: incident.attributes.length,
				}),
				before.length ? before.join('\n') : 'None',
				true,
			)
			.addField(
				i18next.t('select.feedback_wrong_attributes_after_fieldtitle', {
					lng: settings.locale,
					count: interaction.values.length,
				}),
				after.length ? after.join('\n') : 'None',
				true,
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
