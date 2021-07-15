import { Snowflake, CommandInteraction, DMChannel } from 'discord.js';
import { ArgumentsOf } from '../types/ArgumentsOf';
import { truncate } from '../functions/util';
import { FetchLogCommand } from '../interactions/fetchLog';
import { FETCHLOG_CHANNELTYPE, FETCHLOG_GUILD, FETCHLOG_NOTLOG, NOT_IN_DM } from '../messages/messages';

export async function handleFetchLogCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof FetchLogCommand>,
) {
	const { client, guild } = interaction;
	if (!guild) {
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});
	}
	const regex = /https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})/gi;
	const link = args.link;
	const match = regex.exec(link);
	if (match) {
		const [, guildId, channelId, messageId] = match;
		try {
			const channel = client.channels.resolve(channelId as Snowflake);
			if (!channel?.isText() || channel instanceof DMChannel) {
				return void interaction.reply({
					content: FETCHLOG_CHANNELTYPE,
					ephemeral: true,
				});
			}

			if (channel.guild.id !== guildId) {
				return void interaction.reply({
					content: FETCHLOG_GUILD(channel.guild.id, guildId as Snowflake),
					ephemeral: true,
				});
			}

			const message = await channel.messages.fetch(messageId as Snowflake);
			if (!message.embeds.length || message.author.id !== client.user!.id) {
				return void interaction.reply({
					content: FETCHLOG_NOTLOG,
					ephemeral: true,
				});
			}
			const { content, components, embeds } = message;
			return void interaction.reply({
				content: content.length ? content : undefined,
				components,
				embeds,
				ephemeral: true,
			});
		} catch (error) {
			return void interaction.reply({
				content: `\`\`\`\n${truncate(error.toString(), 1990, '\n')}\n\`\`\``,
				ephemeral: true,
			});
		}
	}
}
