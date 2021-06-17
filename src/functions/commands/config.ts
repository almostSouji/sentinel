import { GuildChannel, CommandInteraction, Permissions, Snowflake } from 'discord.js';
import { CHANNELS_LOG } from '../../keys';
import {
	CONFIG_SHOW_CHANNEL,
	CONFIG_SHOW_CHANNEL_MISSING,
	CONFIG_SHOW_CHANNEL_MISSING_PERMISSIONS,
	LOG_CHANNEL_SET,
	LOG_NOT_TEXT,
	LOG_NO_PERMS,
	NOT_IN_DM,
} from '../../messages/messages';
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

	void interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
