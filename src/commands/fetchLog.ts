import { Snowflake, CommandInteraction, DMChannel, MessageEmbed } from 'discord.js';
import { ArgumentsOf } from '../types/ArgumentsOf';
import { FetchLogCommand } from '../interactions/fetchLog';
import i18next from 'i18next';
import { replyWithError } from '../utils/responses';
import { truncate } from '../utils';
import { codeBlock, inlineCode } from '@discordjs/builders';
import { GuildSettings, Incident } from '../types/DataTypes';
import { inspect } from 'util';
import { COLOR_DARK } from '../constants';

export async function handleFetchLogCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof FetchLogCommand>,
	locale: string,
) {
	const {
		client,
		client: { sql },
	} = interaction;

	const regex = /https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})/gi;
	const link = args.link;
	const match = regex.exec(link);
	if (match) {
		const [, guildId, channelId, messageId] = match;
		try {
			const channel = client.channels.resolve(channelId as Snowflake);
			if (!channel?.isText() || channel instanceof DMChannel) {
				return replyWithError(interaction, i18next.t('commands.fetchlog.invalid_channel_type', { lng: locale }));
			}

			if (channel.guild.id !== guildId) {
				return replyWithError(
					interaction,
					i18next.t('commands.fetchlog.guild_id_forged', {
						lng: locale,
						actual: inlineCode(channel.guild.id),
						should: inlineCode(guildId ?? ' '),
					}),
				);
			}

			const message = await channel.messages.fetch(messageId as Snowflake);
			if (!message.embeds.length || message.author.id !== client.user!.id) {
				return replyWithError(interaction, i18next.t('commands.fetchlog.not_a_log', { lng: locale }));
			}
			const { content, components, embeds } = message;

			const dataEmbeds: MessageEmbed[] = [];

			if (args.incident) {
				const [incident] = await sql<Incident[]>`select * from incidents where logmessage = ${message.id}`;

				dataEmbeds.push(
					new MessageEmbed()
						.setTitle('Incident data')
						.setColor(COLOR_DARK)
						.setDescription(codeBlock('js', truncate(inspect(incident, { depth: null }), 3000, '\n'))),
				);
			}

			if (args.settings) {
				const [settings] = await sql<GuildSettings[]>`select * from guild_settings where guild = ${guildId}`;

				dataEmbeds.push(
					new MessageEmbed()
						.setTitle('Guild settings')
						.setColor(COLOR_DARK)
						.setDescription(codeBlock('js', truncate(inspect(settings, { depth: null }), 3000, '\n'))),
				);
			}

			if (args.components) {
				dataEmbeds.push(
					new MessageEmbed()
						.setTitle('Components')
						.setColor(COLOR_DARK)
						.setDescription(codeBlock('js', truncate(inspect(components, { depth: 4 }), 3000, '\n'))),
				);
			}

			return interaction.reply({
				content: content.length ? content : undefined,
				embeds: [...embeds, ...dataEmbeds],
				ephemeral: true,
			});
		} catch (error) {
			return void interaction.reply({
				content: codeBlock(truncate(error.toString(), 1990, '\n')),
				ephemeral: true,
			});
		}
	}
}
