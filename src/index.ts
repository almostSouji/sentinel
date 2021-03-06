/* eslint-disable @typescript-eslint/no-misused-promises */
import { Intents, GuildChannel, Permissions, DMChannel } from 'discord.js';
import { CID_SEPARATOR } from './utils/constants';
import Client from './structures/Client';
import { checkMessage } from './functions/inspection/checkMessage';
import { logger } from './utils/logger';
import { destructureIncidentButtonId } from './utils';
import { handleCommands } from './functions/commandHandling/handleCommands';
import { Guildlist, GuildSettings, Incident } from './types/DataTypes';
import i18next from 'i18next';
import { replyWithError } from './utils/responses';
import { handleReviewButton } from './components/reviewButton';
import { handleMessageDeleteLogstate } from './logState/messageDelete';
import { handleGuildBanAddLogstate } from './logState/guildBanAdd';
import { handleFeedbackSelect } from './components/feedbackSelect';
import { handleFeedbackAcceptButton } from './components/feedbackAcceptButton';
import { handleFeedbackRejectButton } from './components/feedbackRejectButton';
import { handleFeedbackButton } from './components/feedbackButton';
import { handleSetCommandSelect } from './components/setCommandSelect';
import { handleDebugSelect } from './components/debugSelect';
import { handleGuildListAddButton } from './components/guildListAddButton';
import { handleGuildListRemoveButton } from './components/guildListRemoveButton';

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
	BAN_LEGACY,
	DELETE_LEGACY,
	PERSPECTIVE_FEEDBACK,
	PERSPECTIVE_FEEDBACK_ACCEPT,
	PERSPECTIVE_FEEDBACK_REJECT,
	PERSPECTIVE_FEEDBACK_BUTTON,
	SET_COMMANDS_SELECT,
	DEBUG_SELECT,
	GUILD_LIST_ADD,
	GUILD_LIST_REMOVE,
}

export type ActionOpCodes = OpCodes.REVIEW;
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
				const [allowed] = await client.sql<Guildlist[]>`select * from guild_list where guild = ${message.guildId}`;
				if (!allowed) return;
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

			const [allowed] = await client.sql<Guildlist[]>`select * from guild_list where guild = ${oldMessage.guildId}`;
			if (!allowed) return;

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
			const [allowed] = await client.sql<Guildlist[]>`select * from guild_list where guild = ${interaction.guildId}`;

			if (interaction.isCommand() || interaction.isContextMenu()) {
				try {
					if (!allowed) return replyWithError(interaction, i18next.t('common.errors.guild_disabled'));
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
				if (!allowed) return replyWithError(interaction, i18next.t('common.errors.guild_disabled'));

				const [preOPString, guildId] = interaction.customId.split(CID_SEPARATOR);
				const preOp = parseInt(preOPString, 10);
				const targetGuild = client.guilds.resolve(guildId);

				if (preOp === OpCodes.GUILD_LIST_ADD) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (!targetGuild) return;

					await handleGuildListAddButton(interaction, targetGuild);
					return;
				} else if (preOp === OpCodes.GUILD_LIST_REMOVE) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (!targetGuild) return;

					await handleGuildListRemoveButton(interaction, targetGuild);
					return;
				}

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
					case OpCodes.REVIEW:
						return handleReviewButton(interaction, settings, incident);
					case OpCodes.PERSPECTIVE_FEEDBACK_BUTTON:
						return handleFeedbackButton(interaction, settings, incident);
					case OpCodes.PERSPECTIVE_FEEDBACK_ACCEPT:
						return handleFeedbackAcceptButton(interaction, settings, incidentId);
					case OpCodes.PERSPECTIVE_FEEDBACK_REJECT:
						return handleFeedbackRejectButton(interaction, settings, incidentId);
					case OpCodes.NOOP:
					case OpCodes.BAN_LEGACY:
					case OpCodes.DELETE_LEGACY:
						return;
					default:
						// - unknown button
						return replyWithError(interaction, i18next.t('common.errors.unknown_button', { lng }));
				}
			}

			if (interaction.isSelectMenu()) {
				if (!allowed) return replyWithError(interaction, i18next.t('common.errors.guild_disabled'));

				if (
					!interaction.guild ||
					!interaction.channel ||
					!interaction.channel.isText() ||
					interaction.channel.partial ||
					interaction.channel instanceof DMChannel
				)
					return;

				const [op, incidentId] = destructureIncidentButtonId(interaction.customId);

				if (op === OpCodes.SET_COMMANDS_SELECT) {
					const [, guildId] = interaction.customId.split(CID_SEPARATOR);
					const targetGuild = client.guilds.resolve(guildId);
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (!targetGuild) return replyWithError(interaction, 'Cannot resolve guild');
					return handleSetCommandSelect(interaction, targetGuild);
				}

				if (op === OpCodes.DEBUG_SELECT) {
					const [, guildId] = interaction.customId.split(CID_SEPARATOR);
					const targetGuild = client.guilds.resolve(guildId);
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (!targetGuild) return replyWithError(interaction, 'Cannot resolve guild');
					return handleDebugSelect(interaction, targetGuild);
				}

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
			const [allowed] = await client.sql<Guildlist[]>`select * from guild_list where guild = ${message.guildId}`;
			if (!allowed) return;

			if (message.author?.bot || message.channel.type !== 'GUILD_TEXT' || message.partial) return;
			try {
				await handleMessageDeleteLogstate(client, message);
			} catch (error: any) {
				logger.error(error, error.message);
			}
		});

		client.on('messageDeleteBulk', async (messages) => {
			const [allowed] = await client.sql<Guildlist[]>`select * from guild_list where guild = ${
				messages.first()!.guildId
			}`;
			if (!allowed) return;

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
			const [allowed] = await client.sql<Guildlist[]>`select * from guild_list where guild = ${ban.guild.id}`;
			if (!allowed) return;

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
