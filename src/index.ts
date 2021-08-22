/* eslint-disable @typescript-eslint/no-misused-promises */
import { Intents, GuildChannel, Permissions } from 'discord.js';
import { CID_SEPARATOR } from './utils/constants';
import Client from './structures/Client';
import { checkMessage } from './functions/inspection/checkMessage';
import { logger } from './utils/logger';
import { destructureIncidentButtonId } from './utils';
import { handleCommands } from './functions/commandHandling/handleCommands';
import { GuildSettings, Incident } from './types/DataTypes';
import i18next from 'i18next';
import { replyWithError } from './utils/responses';
import { messageSpam } from './functions/antiRaid/messageSpam';
import { handleBanButton } from './buttons/banButton';
import { handleDeleteButton } from './buttons/deleteButton';
import { handleReviewButton } from './buttons/reviewButton';
import { handleMessageDeleteLogstate } from './logState/messageDelete';
import { handleGuildBanAddLogstate } from './logState/guildBanAdd';

export interface ProcessEnv {
	DISCORD_TOKEN: string;
	PERSPECTIVE_TOKEN: string;
	DISCORD_CLIENT_ID: string;
	DEPLOY_GUILD_ID?: string;
	ESHOST: string;
	ESPORT: string;
	SCAM_URL_REMOTE_URL: string;
}

export enum OpCodes {
	NOOP,
	REVIEW,
	BAN,
	DELETE,
}

export type ActionOpCodes = OpCodes.REVIEW | OpCodes.BAN | OpCodes.DELETE;

async function main() {
	const client = new Client({
		intents: [
			Intents.FLAGS.GUILD_MESSAGES,
			Intents.FLAGS.GUILDS,
			Intents.FLAGS.GUILD_MEMBERS,
			Intents.FLAGS.GUILD_BANS,
		],
	});

	try {
		await client.init();

		client.on('messageCreate', async (message) => {
			try {
				if (message.author.bot || !message.content.length) return;
				await checkMessage(message);
				await messageSpam(message);
			} catch (err) {
				logger.error(err);
			}
		});

		client.on('messageUpdate', async (oldMessage, newMessage) => {
			if (
				oldMessage.content === newMessage.content ||
				newMessage.author?.bot ||
				newMessage.channel.type !== 'GUILD_TEXT'
			)
				return;
			try {
				await checkMessage(newMessage, true);
			} catch (error) {
				logger.error(error);
			}
		});

		client.on('ready', () => {
			logger.info(
				i18next.t('ready.ready_log', {
					user: client.user!.tag,
					id: client.user!.id,
					lng: 'en-US',
				}),
			);
		});

		client.on('interactionCreate', async (interaction) => {
			if (interaction.isCommand() || interaction.isContextMenu()) {
				try {
					await handleCommands(interaction);
				} catch (error) {
					Error.stackTraceLimit = Infinity;
					logger.error(error);
					await replyWithError(interaction, i18next.t('common.errors.during_command'));
				}
				return;
			}

			if (interaction.isMessageComponent()) {
				const { sql } = client;

				if (
					!interaction.guild ||
					!(interaction.channel instanceof GuildChannel) ||
					interaction.channel.isThread() ||
					!interaction.channel.isText()
				)
					return;

				const [settings] = await sql<
					GuildSettings[]
				>`select * from guild_settings where guild = ${interaction.guild.id}`;
				if (!settings) return;
				const lng = settings.locale;

				if (
					!interaction.channel
						.permissionsFor(interaction.user)
						?.has([Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.MANAGE_MESSAGES])
				) {
					// - no permissions to handle incidents
					await replyWithError(interaction, i18next.t('buttons.incident_handling_not_allowed', { lng }));
				}

				if (!interaction.customId.includes(CID_SEPARATOR)) {
					// - legacy button
					return replyWithError(interaction, i18next.t('buttons.legacy', { lng }));
				}

				const [op, incidentId] = destructureIncidentButtonId(interaction.customId);
				if (Number.isNaN(incidentId)) {
					// - legacy button
					return replyWithError(interaction, i18next.t('buttons.legacy', { lng }));
				}

				const [incident] = await sql<Incident[]>`
				select * from incidents where id = ${incidentId}
			`;

				if (!incident) {
					// - no incident found in db
					return replyWithError(interaction, i18next.t('buttons.no_incident', { lng }));
				}

				switch (op) {
					case OpCodes.BAN:
						return handleBanButton(interaction, settings, incident);
					case OpCodes.DELETE:
						return handleDeleteButton(interaction, settings, incident);
					case OpCodes.REVIEW:
						return handleReviewButton(interaction, settings, incident);
					default:
						// - unknown button
						return replyWithError(interaction, i18next.t('common.errors.unknown_button', { lng }));
				}
			}

			// ~ unhandled interaction
			logger.debug({
				msg: 'unknown interaction',
				interaction,
			});
		});

		client.on('messageDelete', async (message) => {
			if (message.author?.bot || message.channel.type !== 'GUILD_TEXT' || message.partial) return;
			try {
				await handleMessageDeleteLogstate(client, message);
			} catch (error) {
				logger.error(error);
			}
		});

		client.on('messageDeleteBulk', async (messages) => {
			for (const message of messages.values()) {
				if (message.author?.bot || message.channel.type !== 'GUILD_TEXT' || message.partial) return;
				try {
					await handleMessageDeleteLogstate(client, message);
				} catch (error) {
					logger.error(error);
				}
			}
		});

		client.on('guildBanAdd', async (ban) => {
			try {
				await handleGuildBanAddLogstate(client, ban);
			} catch (error) {
				logger.error(error);
			}
		});

		await client.login(process.env.DISCORD_TOKEN);
	} catch (error) {
		logger.error(error);
	}
}

void main();
