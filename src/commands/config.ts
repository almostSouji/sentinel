import { ConfigCommand } from '../interactions/config';

import { CommandInteraction, MessageEmbed, Permissions, Snowflake } from 'discord.js';
import { ATTRIBUTES, CHANNELS_LOG, CHANNELS_WATCHING, IMMUNITY, PREFETCH, STRICTNESS } from '../keys';
import {
	CONFIG_IMMUNITY_SET,
	CONFIG_PREFETCH_SET,
	CONFIG_SHOW_CHANNEL_MISSING,
	CONFIG_SHOW_WATCHING_NONE,
	CONFIG_STRICTNESS_SET,
	EXPLAIN_FORCED,
	EXPLAIN_NSFW,
	LOG_CHANNEL_SET,
	LOG_NOT_TEXT,
	LOG_NO_PERMS,
	NOT_IN_DM,
	EXPLAIN_NYT,
} from '../messages/messages';
import { STRICTNESS_LEVELS } from '../functions/checkMessage';
import { formatChannelMentions } from './watch';
import { ArgumentsOf } from '../types/ArgumentsOf';
import { forcedAttributes, nsfwAtrributes, nytAttributes } from '../functions/perspective';
import { COLOR_PURPLE, PREFIX_ERROR, PREFIX_LOCKED, PREFIX_NSFW, PREFIX_NYT } from '../constants';

export enum IMMUNITY_LEVEL {
	NONE,
	MANAGE_MESSAGES,
	BAN_MEMBERS,
	ADMINISTRATOR,
}

export async function handleConfigCommand(interaction: CommandInteraction, args: ArgumentsOf<typeof ConfigCommand>) {
	const messageParts = [];
	const {
		client,
		client: { redis },
		guild,
	} = interaction;
	if (!guild) {
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});
	}

	const actions = [...Object.keys(args)] as (keyof ArgumentsOf<typeof ConfigCommand>)[];
	if (actions.includes('immunity')) {
		const level = args.immunity!;
		await redis.set(IMMUNITY(guild.id), level);
		messageParts.push(CONFIG_IMMUNITY_SET(IMMUNITY_LEVEL[level]));
	}
	if (actions.includes('logchannel')) {
		const channel = args.logchannel!;
		if (channel.isText()) {
			if (
				channel
					.permissionsFor(client.user!)
					?.has([Permissions.FLAGS.EMBED_LINKS, Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.READ_MESSAGE_HISTORY])
			) {
				await redis.set(CHANNELS_LOG(guild.id), channel.id);
				messageParts.push(LOG_CHANNEL_SET(channel.name));
			} else {
				messageParts.push(LOG_NO_PERMS);
			}
		} else {
			messageParts.push(LOG_NOT_TEXT(channel.toString(), channel.type));
		}
	}
	if (actions.includes('prefetch')) {
		const amount = args.prefetch!;
		await redis.set(PREFETCH(guild.id), amount);
		messageParts.push(CONFIG_PREFETCH_SET(amount));
	}
	if (actions.includes('strictness')) {
		const level = args.strictness!;
		await redis.set(STRICTNESS(guild.id), level);
		messageParts.push(CONFIG_STRICTNESS_SET(STRICTNESS_LEVELS[level]));
	}

	if (!actions.length) {
		const embed = new MessageEmbed();
		const channelValue = await redis.get(CHANNELS_LOG(guild.id));
		const channel = guild.channels.resolve((channelValue ?? '0') as Snowflake);
		const missing = channel
			?.permissionsFor(client.user!)
			?.missing([
				Permissions.FLAGS.EMBED_LINKS,
				Permissions.FLAGS.VIEW_CHANNEL,
				Permissions.FLAGS.READ_MESSAGE_HISTORY,
			]);

		embed.addField(
			'Log Channel',
			channel
				? missing?.length
					? `${PREFIX_ERROR} <#${channel.id}> (missing permissions: ${missing.map((k) => `\`${k}\``).join(', ')})`
					: `<#${channel.id}>`
				: CONFIG_SHOW_CHANNEL_MISSING,
		);

		const channels = await redis.smembers(CHANNELS_WATCHING(guild.id));
		embed.addField(
			`Watched channels (${channels.length})`,
			channels.length ? channels.map((c) => formatChannelMentions(c)).join(', ') : CONFIG_SHOW_WATCHING_NONE,
			false,
		);

		const strictness = parseInt((await redis.get(STRICTNESS(guild.id))) ?? '1', 10);
		embed.addField('Strictness Level', STRICTNESS_LEVELS[strictness], true);

		const immunityValue = await redis.get(IMMUNITY(guild.id));
		embed.addField('Immunity Permission', IMMUNITY_LEVEL[immunityValue ? parseInt(immunityValue, 10) : 0], true);

		const prefetchValue = await redis.get(PREFETCH(guild.id));
		embed.addField('Prefetch Messages', String(parseInt(prefetchValue ?? '0', 10)), true);

		const attributes = [...new Set([...forcedAttributes, ...(await redis.smembers(ATTRIBUTES(guild.id)))])];

		const disclaimers = [];
		const activeRegular = [];
		const activeNyt = [];
		let nsfw = 0;

		for (const flag of attributes) {
			if (nytAttributes.includes(flag)) {
				if (nsfwAtrributes.includes(flag)) {
					activeNyt.push(`• \`${flag}\` ${PREFIX_NYT} ${PREFIX_NSFW}`);
					nsfw++;
				} else if (forcedAttributes.includes(flag)) activeNyt.push(`• \`${flag}\` ${PREFIX_NYT} ${PREFIX_LOCKED}`);
				else activeNyt.push(`• \`${flag}\` ${PREFIX_NYT}`);
			} else if (nsfwAtrributes.includes(flag)) {
				activeRegular.push(`• \`${flag}\` ${PREFIX_NSFW}`);
				nsfw++;
			} else if (forcedAttributes.includes(flag)) activeRegular.push(`• \`${flag}\` ${PREFIX_LOCKED}`);
			else activeRegular.push(`• \`${flag}\``);
		}

		if (activeRegular.length) {
			embed.addField('Attributes', activeRegular.join('\n'), true);
		}

		if (activeNyt.length) {
			disclaimers.push(EXPLAIN_NYT);
			embed.addField('NYTimes Attributes', activeNyt.join('\n'), true);
		}

		if (nsfw) {
			disclaimers.push(EXPLAIN_NSFW);
		}

		disclaimers.push(EXPLAIN_FORCED);

		if (disclaimers.length) {
			embed.addField('\u200B', disclaimers.join('\n'));
		}

		embed.setColor(COLOR_PURPLE);

		return interaction.reply({
			embeds: [embed],
			ephemeral: true,
		});
	}

	return interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
