import { GuildChannel, CommandInteraction, Permissions, Snowflake } from 'discord.js';
import { ATTRIBUTES, CHANNELS_LOG, CHANNELS_WATCHING, IMMUNITY, PREFETCH, STRICTNESS } from '../../keys';
import {
	CONFIG_IMMUNITY_SET,
	CONFIG_PREFETCH_SET,
	CONFIG_SHOW_ATTRIBUTES,
	CONFIG_SHOW_ATTRIBUTES_NONE,
	CONFIG_SHOW_CHANNEL,
	CONFIG_SHOW_CHANNEL_MISSING,
	CONFIG_SHOW_CHANNEL_MISSING_PERMISSIONS,
	CONFIG_SHOW_IMMUNITY,
	CONFIG_SHOW_PREFETCH,
	CONFIG_SHOW_STRICTNESS,
	CONFIG_SHOW_WATCHING,
	CONFIG_SHOW_WATCHING_NONE,
	CONFIG_STRICTNESS_SET,
	LOG_CHANNEL_SET,
	LOG_NOT_TEXT,
	LOG_NO_PERMS,
	NOT_IN_DM,
} from '../../messages/messages';
import { STRICTNESS_LEVELS } from '../checkMessage';
import { formatChannelMentions } from './watch';

export enum IMMUNITY_LEVEL {
	NONE,
	MANAGE_MESSAGES,
	BAN_MEMBERS,
	ADMINISTRATOR,
}

export async function configCommand(interaction: CommandInteraction) {
	const messageParts = [];

	const {
		options,
		client,
		client: { redis },
		guildID,
		guild,
	} = interaction;
	if (!guildID || !guild) {
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});
	}

	if (!options.size) {
		const channelValue = await redis.get(CHANNELS_LOG(guildID));
		const channel = guild.channels.resolve((channelValue ?? '0') as Snowflake);
		const missing = channel
			?.permissionsFor(client.user!)
			?.missing([
				Permissions.FLAGS.EMBED_LINKS,
				Permissions.FLAGS.VIEW_CHANNEL,
				Permissions.FLAGS.READ_MESSAGE_HISTORY,
			]);
		if (missing?.length) {
			messageParts.push(
				CONFIG_SHOW_CHANNEL_MISSING_PERMISSIONS(channel?.id ?? '0', missing.map((k) => `\`${k}\``).join(', ')),
			);
		} else {
			messageParts.push(channel ? CONFIG_SHOW_CHANNEL(channel.id) : CONFIG_SHOW_CHANNEL_MISSING);
		}

		const channels = await redis.smembers(CHANNELS_WATCHING(guildID));
		if (channels.length) {
			messageParts.push(CONFIG_SHOW_WATCHING(channels.map((c) => formatChannelMentions(c)).join(', ')));
		} else {
			messageParts.push(CONFIG_SHOW_WATCHING_NONE);
		}

		const strictness = parseInt((await redis.get(STRICTNESS(guild.id))) ?? '1', 10);
		messageParts.push(CONFIG_SHOW_STRICTNESS(STRICTNESS_LEVELS[strictness]));

		const immunityValue = await redis.get(IMMUNITY(guildID));
		messageParts.push(CONFIG_SHOW_IMMUNITY(IMMUNITY_LEVEL[immunityValue ? parseInt(immunityValue, 10) : 0]));

		const prefetchValue = await redis.get(PREFETCH(guildID));
		messageParts.push(CONFIG_SHOW_PREFETCH(parseInt(prefetchValue ?? '0', 10)));

		const attributes = await redis.smembers(ATTRIBUTES(guildID));

		const flags = attributes.map((a) => `\`${a}\``);
		if (flags.length) {
			messageParts.push(CONFIG_SHOW_ATTRIBUTES(flags.join(', ')));
		} else {
			messageParts.push(CONFIG_SHOW_ATTRIBUTES_NONE);
		}

		return interaction.reply({
			content: messageParts.join('\n'),
			ephemeral: true,
		});
	}

	const logOption = options.get('logchannel');
	if (logOption) {
		const logChannel = logOption.channel! as GuildChannel;
		if (logChannel.isText()) {
			if (
				logChannel
					.permissionsFor(client.user!)
					?.has([Permissions.FLAGS.EMBED_LINKS, Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.READ_MESSAGE_HISTORY])
			) {
				void redis.set(CHANNELS_LOG(guildID), logChannel.id);
				messageParts.push(LOG_CHANNEL_SET(logChannel.name));
			} else {
				messageParts.push(LOG_NO_PERMS);
			}
		} else {
			messageParts.push(LOG_NOT_TEXT(logChannel.toString(), logChannel.type));
		}
	}

	const strictnessOption = options.get('strictness');
	if (strictnessOption) {
		const level = strictnessOption.value as number;
		void redis.set(STRICTNESS(guildID), level);
		messageParts.push(CONFIG_STRICTNESS_SET(STRICTNESS_LEVELS[level]));
	}

	const immunityOption = options.get('immunity');
	if (immunityOption) {
		const level = immunityOption.value as number;
		void redis.set(IMMUNITY(guildID), level);
		messageParts.push(CONFIG_IMMUNITY_SET(IMMUNITY_LEVEL[level]));
	}

	const prefetchOption = options.get('prefetch');
	if (prefetchOption) {
		const amount = prefetchOption.value as number;
		void redis.set(PREFETCH(guildID), amount);
		messageParts.push(CONFIG_PREFETCH_SET(amount));
	}

	void interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
