import {
	CommandInteraction,
	Constants,
	DMChannel,
	MessageActionRow,
	MessageButton,
	MessageEmbed,
	ThreadChannel,
} from 'discord.js';
import { ArgumentsOf } from '../types/ArgumentsOf';
import { FetchLogCommand } from '../interactions/fetchLog';
import i18next from 'i18next';
import { replyWithError } from '../utils/responses';
import { truncate } from '../utils';
import { codeBlock } from '@discordjs/builders';
import { GuildSettings, Incident } from '../types/DataTypes';
import { inspect } from 'util';
import { COLOR_DARK } from '../constants';
import { logger } from '../functions/logger';

export async function handleFetchLogCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof FetchLogCommand>,
	locale: string,
) {
	const {
		client,
		client: { sql },
	} = interaction;

	const regex = /https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/\d{17,19}\/\d{17,19}\/(\d{17,19})/gi;
	let incidentOrMessageId = args.logmessage;
	const match = regex.exec(incidentOrMessageId);
	if (match) {
		incidentOrMessageId = match[1] ?? incidentOrMessageId;
	}

	try {
		let incident;
		if (parseInt(incidentOrMessageId, 10) >= Number.MAX_SAFE_INTEGER) {
			incident = (await sql<Incident[]>`select * from incidents where logmessage = ${incidentOrMessageId}`)[0];
		} else {
			incident = (await sql<Incident[]>`select * from incidents where id = ${incidentOrMessageId}`)[0];
		}

		if (!incident) {
			return replyWithError(
				interaction,
				i18next.t('commands.fetchlog.no_incident', {
					lng: locale,
				}),
			);
		}

		const channel = client.channels.resolve(incident.logchannel ?? ' ');
		if (!channel || !channel.isText() || channel instanceof ThreadChannel || channel instanceof DMChannel) {
			return replyWithError(
				interaction,
				i18next.t('commands.fetchlog.invalid_channel_type', {
					lng: locale,
				}),
			);
		}

		try {
			const message = await channel.messages.fetch(incident.logmessage ?? '');
			if (!message.embeds.length || message.author.id !== client.user!.id) {
				return replyWithError(interaction, i18next.t('commands.fetchlog.not_a_log', { lng: locale }));
			}
			const { content, components, embeds } = message;

			const dataEmbeds: MessageEmbed[] = [];
			const row = new MessageActionRow();

			if (incident.logchannel && incident.logmessage) {
				row.addComponents(
					new MessageButton()
						.setURL(`https://discord.com/channels/${incident.guild}/${incident.logchannel}/${incident.logmessage}`)
						.setStyle(Constants.MessageButtonStyles.LINK)
						.setLabel('Logmessage'),
				);
			}

			if (args.incident) {
				dataEmbeds.push(
					new MessageEmbed()
						.setTitle('Incident data')
						.setColor(COLOR_DARK)
						.setDescription(codeBlock('js', truncate(inspect(incident, { depth: null }), 3000, '\n'))),
				);
			}

			if (args.settings) {
				const [settings] = await sql<GuildSettings[]>`select * from guild_settings where guild = ${incident.guild}`;

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
				components: row.components.length ? [row] : [],
				ephemeral: true,
			});
		} catch (error) {
			const dataEmbeds: MessageEmbed[] = [];
			const row = new MessageActionRow();

			if (incident.logchannel && incident.logmessage) {
				row.addComponents(
					new MessageButton()
						.setURL(`https://discord.com/channels/${incident.guild}/${incident.logchannel}/${incident.logmessage}`)
						.setStyle(Constants.MessageButtonStyles.LINK)
						.setLabel('Logmessage'),
				);
			}

			if (args.incident) {
				dataEmbeds.push(
					new MessageEmbed()
						.setTitle('Incident data')
						.setColor(COLOR_DARK)
						.setDescription(codeBlock('js', truncate(inspect(incident, { depth: null }), 3000, '\n'))),
				);
			}

			if (args.settings) {
				const [settings] = await sql<GuildSettings[]>`select * from guild_settings where guild = ${incident.guild}`;

				dataEmbeds.push(
					new MessageEmbed()
						.setTitle('Guild settings')
						.setColor(COLOR_DARK)
						.setDescription(codeBlock('js', truncate(inspect(settings, { depth: null }), 3000, '\n'))),
				);
			}

			return interaction.reply({
				content: codeBlock(truncate(error.toString(), 1990, '\n')),
				embeds: [...dataEmbeds],
				components: row.components.length ? [row] : [],
				ephemeral: true,
			});
		}
	} catch (error) {
		return void interaction
			.reply({
				content: codeBlock(truncate(error.toString(), 1990, '\n')),
				ephemeral: true,
			})
			.catch((err) => logger.error(err));
	}
}
