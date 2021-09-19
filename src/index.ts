/* eslint-disable @typescript-eslint/no-misused-promises */
import { Intents, GuildChannel, Permissions, DMChannel } from 'discord.js';
import { CID_SEPARATOR } from './utils/constants';
import Client from './structures/Client';
import { checkMessage } from './functions/inspection/checkMessage';
import { logger } from './utils/logger';
import { destructureIncidentButtonId } from './utils';
import { handleCommands } from './functions/commandHandling/handleCommands';
import { GuildSettings, Incident } from './types/DataTypes';
import i18next from 'i18next';
import { replyWithError } from './utils/responses';
import { handleBanButton } from './components/banButton';
import { handleDeleteButton } from './components/deleteButton';
import { handleReviewButton } from './components/reviewButton';
import { handleMessageDeleteLogstate } from './logState/messageDelete';
import { handleGuildBanAddLogstate } from './logState/guildBanAdd';
import { handleFeedbackSelect } from './components/feedbackSelect';
import { handleFeedbackAcceptButton } from './components/feedbackAcceptButton';
import { handleFeedbackRejectButton } from './components/feedbackRejectButton';
import { handleFeedbackButton } from './components/feedbackButton';

export interface ProcessEnv {
	DISCORD_TOKEN: string;
	PERSPECTIVE_TOKEN: string;
	DISCORD_CLIENT_ID: string;
	DEPLOY_GUILD_ID?: string;
	ESHOST: string;
	ESPORT: string;
	SCAM_URL_REMOTE_URL: string;
	PERSPECTIVE_FEEDBACK_CHANNEL: string;
}

export enum OpCodes {
	NOOP,
	REVIEW,
	BAN,
	DELETE,
	PERSPECTIVE_FEEDBACK,
	PERSPECTIVE_FEEDBACK_ACCEPT,
	PERSPECTIVE_FEEDBACK_REJECT,
	PERSPECTIVE_FEEDBACK_BUTTON,
}

export type ActionOpCodes = OpCodes.REVIEW | OpCodes.BAN | OpCodes.DELETE;
const feedbackOPCodes = [
	OpCodes.PERSPECTIVE_FEEDBACK,
	OpCodes.PERSPECTIVE_FEEDBACK_ACCEPT,
	OpCodes.PERSPECTIVE_FEEDBACK_REJECT,
];

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
			} catch (err: any) {
				logger.error(err, err.message);
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
			} catch (error: any) {
				logger.error(error, error.message);
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
				} catch (error: any) {
					Error.stackTraceLimit = Infinity;
					logger.error(error, error.message);
					await replyWithError(interaction, i18next.t('common.errors.during_command'));
				}
				return;
			}

			const { sql } = client;
			if (interaction.isButton()) {
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
				if (!settings) {
					logger.info(`Button seen on guild ${interaction.guild.id}, but could not find settings`);
					return;
				}
				const lng = settings.locale;

				if (
					!interaction.channel
						.permissionsFor(interaction.user)
						?.has([Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.MANAGE_MESSAGES])
				) {
					// - no permissions to handle incidents
					return replyWithError(interaction, i18next.t('buttons.incident_handling_not_allowed', { lng }));
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

				if (!incident && !feedbackOPCodes.includes(op)) {
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
					case OpCodes.PERSPECTIVE_FEEDBACK_BUTTON:
						return handleFeedbackButton(interaction, settings, incident);
					case OpCodes.PERSPECTIVE_FEEDBACK_ACCEPT:
						return handleFeedbackAcceptButton(interaction, settings, incidentId);
					case OpCodes.PERSPECTIVE_FEEDBACK_REJECT:
						return handleFeedbackRejectButton(interaction, settings, incidentId);
					default:
						// - unknown button
						return replyWithError(interaction, i18next.t('common.errors.unknown_button', { lng }));
				}
			}

			if (interaction.isSelectMenu()) {
				if (
					!interaction.guild ||
					!interaction.channel ||
					!interaction.channel.isText() ||
					interaction.channel.partial ||
					interaction.channel instanceof DMChannel
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
					// - no permissions to use selects
					return replyWithError(interaction, i18next.t('select.incident_handling_not_allowed', { lng }));
				}

				const [op, incidentId] = destructureIncidentButtonId(interaction.customId);
				switch (op) {
					case OpCodes.PERSPECTIVE_FEEDBACK:
						return handleFeedbackSelect(interaction, incidentId, settings);
					default:
						// - unknown select
						return replyWithError(interaction, i18next.t('common.errors.unknown_select', { lng }));
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
			} catch (error: any) {
				logger.error(error, error.message);
			}
		});

		client.on('messageDeleteBulk', async (messages) => {
			for (const message of messages.values()) {
				if (message.author?.bot || message.channel.type !== 'GUILD_TEXT' || message.partial) return;
				try {
					await handleMessageDeleteLogstate(client, message);
				} catch (error: any) {
					logger.error(error, error.message);
				}
			}
		});

		client.on('guildBanAdd', async (ban) => {
			try {
				await handleGuildBanAddLogstate(client, ban);
			} catch (error: any) {
				logger.error(error, error.message);
			}
		});

		await client.login(process.env.DISCORD_TOKEN);
	} catch (error: any) {
		logger.error(error, error.message);
	}
}

void main();
