import { Snowflake, CommandInteraction, DMChannel } from 'discord.js';
import { ArgumentsOf } from '../types/ArgumentsOf';
import { FetchLogCommand } from '../interactions/fetchLog';
import i18next from 'i18next';
import { replyWithError } from '../utils/responses';
import { truncate } from '../utils';
import { codeBlock, inlineCode } from '@discordjs/builders';

export async function handleFetchLogCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof FetchLogCommand>,
	locale: string,
) {
	const { client } = interaction;

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
			return interaction.reply({
				content: content.length ? content : undefined,
				components,
				embeds,
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
