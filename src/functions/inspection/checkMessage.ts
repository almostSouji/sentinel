import { Message, PartialMessage, Permissions, MessageEmbed, Snowflake, ThreadChannel } from 'discord.js';
import { Score } from '../../types/perspective';
import { logger } from '../../utils/logger';
import { forcedAttributes } from './perspective';
import { sendLog } from '../sendLog';

import { checkContent } from './checkContent';
import { formatPerspectiveShort } from '../formatting/formatPerspective';
import { cleanContent } from '../../utils';
import { COLOR_BLUE, COLOR_GREEN, COLOR_RED, COLOR_YELLOW, COLOR_DARK, COLOR_ORANGE } from '../../utils/constants';
import { GuildSettings, GuildSettingFlags, Immunity, IncidentTypes } from '../../types/DataTypes';
import i18next from 'i18next';

const colors = [COLOR_DARK, COLOR_GREEN, COLOR_YELLOW, COLOR_ORANGE, COLOR_RED, COLOR_BLUE] as const;

export function setSeverityColor(embed: MessageEmbed, severity: number): MessageEmbed {
	return embed.setColor(colors[severity] ?? COLOR_DARK);
}

export interface AttributeHit {
	key: string;
	score: Score;
}

export enum STRICTNESS_LEVELS {
	LOW = 1,
	MEDIUM,
	HIGH,
}

export function strictnessPick(level: number, highValue: number, mediumValue: number, lowValue: number) {
	return level === STRICTNESS_LEVELS.HIGH ? highValue : level === STRICTNESS_LEVELS.MEDIUM ? mediumValue : lowValue;
}

export async function checkMessage(message: Message | PartialMessage, isEdit = false) {
	try {
		const {
			client: { sql },
			client,
			content,
			channel,
			guild,
			system,
			type: messageType,
			author,
			member: authorAsMember,
		} = message;

		if (
			!content ||
			!guild ||
			channel.type === 'DM' ||
			system ||
			!['DEFAULT', 'REPLY'].includes(messageType ?? '') ||
			!author ||
			!authorAsMember
		)
			return;

		const [settings] = await sql<GuildSettings[]>`select * from guild_settings where guild = ${guild.id}`;
		if (!settings) return;
		const locale = settings.locale;

		if (!settings.watching.includes(channel instanceof ThreadChannel ? channel.parentId ?? '0' : channel.id)) return;

		await sql`
			insert into users ${sql({
				user: author.id,
				guild: guild.id,
			})}
			on conflict ("user", guild) do update
			set messages = users.messages + 1
		`;

		const logChannel = guild.channels.resolve(settings.logchannel as Snowflake);
		if (!logChannel || !logChannel.isText()) return;

		if (!cleanContent(content).length) return;

		const immunityValue = settings.immunity;

		if (immunityValue === Immunity[1] && channel.permissionsFor(author)?.has(Permissions.FLAGS.MANAGE_MESSAGES)) return;

		if (immunityValue === Immunity[2] && channel.permissionsFor(author)?.has(Permissions.FLAGS.BAN_MEMBERS)) return;

		if (immunityValue === Immunity[3] && channel.permissionsFor(author)?.has(Permissions.FLAGS.ADMINISTRATOR)) return;

		const strictness = settings.strictness;
		const embed = new MessageEmbed();

		const debug = settings.flags.includes(GuildSettingFlags.DEBUG);
		const attributes = settings.attributes.concat(forcedAttributes);

		const attributeThreshold = strictnessPick(strictness, 90, 93, 95);
		const highThreshold = strictnessPick(strictness, 93, 95, 98);
		const severeThreshold = strictnessPick(strictness, 85, 88, 90);
		const attributeAmount = Math.ceil(
			strictnessPick(strictness, attributes.length * 0.0625, attributes.length * 0.125, attributes.length * 0.1875),
		);
		const highAmount = Math.ceil(
			strictnessPick(strictness, attributes.length * 0.125, attributes.length * 0.1875, attributes.length * 0.25),
		);
		const veryHighAmount = Math.ceil(
			strictnessPick(strictness, attributes.length * 0.3, attributes.length * 0.4, attributes.length * 0.5),
		);
		const severeAmount = 1;

		const { perspective } = await checkContent(
			content,
			settings,
			channel instanceof ThreadChannel ? false : channel.nsfw,
			channel.guildId,
		);
		const { severe, high, tags } = perspective;

		if (high.length < attributeAmount && !severe.length) return;

		const perspectiveSeverity =
			severe.length >= severeAmount ? 4 : high.length >= veryHighAmount ? 3 : high.length >= highAmount ? 2 : 1;
		const severityLevel = Math.max(perspectiveSeverity);

		setSeverityColor(embed, severityLevel);

		embed.addField(
			i18next.t('logstate.attributes_fieldname', { lng: locale }),
			formatPerspectiveShort(perspective, locale),
			true,
		);

		const incidentId = await client.incrIncident();

		if (debug) {
			logger.debug({
				attribute: {
					amount: attributeAmount,
					threshold: attributeThreshold,
					result: tags.length,
				},
				high: {
					amount: highAmount,
					threshold: highThreshold,
					result: high.length,
				},
				severe: {
					amount: severeAmount,
					threshold: severeThreshold,
					result: severe.length,
				},
				misc: {
					immunity: immunityValue,
					strictness,
					severity: severityLevel,
					incident: incidentId,
				},
			});
		}

		const logMessage = await sendLog(
			logChannel,
			message,
			severityLevel,
			embed,
			isEdit,
			incidentId,
			settings.flags.includes(GuildSettingFlags.PERSPECTIVE_FEEDBACK),
		);
		if (!logMessage) return;

		await sql`
			insert into incidents (
				id,
				type,
				message,
				channel,
				guild,
				"user",
				attributes,
				severity,
				logchannel,
				logmessage
			) values (
				${incidentId},
				${IncidentTypes.PERSPECTIVE},
				${message.id},
				${channel.id},
				${guild.id},
				${author.id},
				${sql.array(high.map((t) => t.key))},
				${severityLevel},
				${logMessage.channelId},
				${logMessage.id}
			)
			on conflict do nothing
		`;
	} catch (err: any) {
		logger.error(err, err.message);
	}
}
