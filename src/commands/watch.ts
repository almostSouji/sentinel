import { CommandInteraction, GuildChannel, Permissions } from 'discord.js';
import { CHANNELS_WATCHING } from '../keys';
import {
	CONFIG_CHANNELS_ADD_MISSING_PERMISSIONS,
	CONFIG_CHANNELS_CHANGED,
	CONFIG_CHANNELS_NONE,
	CONFIG_CHANNELS_WRONG_TYPE,
	NOT_IN_DM,
} from '../messages/messages';
import { WatchCommand } from '../interactions/watch';
import { ArgumentsOf } from '../types/ArgumentsOf';

export function formatChannelMentions(id: string) {
	return `<#${id}>`;
}

export async function handleWatchCommand(interaction: CommandInteraction, args: ArgumentsOf<typeof WatchCommand>) {
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

	const missingView = [];
	const wrongTpye = [];

	const valid = [];
	const action = Object.keys(args)[0] as keyof ArgumentsOf<typeof WatchCommand>;
	switch (action) {
		case 'add':
			{
				for (const c of Object.values(args.add)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
					const channel = c as GuildChannel;
					if (!channel.isText()) {
						wrongTpye.push(channel.id);
						continue;
					}
					if (
						!channel
							.permissionsFor(client.user!)
							?.has([Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.READ_MESSAGE_HISTORY])
					) {
						missingView.push(channel.id);
						continue;
					}
					valid.push(channel.id);
				}

				if (missingView.length) {
					messageParts.push(
						CONFIG_CHANNELS_ADD_MISSING_PERMISSIONS(missingView.map((c) => formatChannelMentions(c)).join(', ')),
					);
				}
			}
			break;

		case 'remove': {
			for (const c of Object.values(args.remove)) {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
				const channel = c as GuildChannel;
				if (!channel.isText()) {
					wrongTpye.push(channel.id);
					continue;
				}
				if (
					!channel
						.permissionsFor(client.user!)
						?.has([Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.READ_MESSAGE_HISTORY])
				) {
					missingView.push(channel.id);
					continue;
				}
				valid.push(channel.id);
			}
		}
	}

	if (valid.length) {
		switch (action) {
			case 'add':
				await redis.sadd(CHANNELS_WATCHING(guild.id), ...valid);
				break;
			case 'remove':
				await redis.srem(CHANNELS_WATCHING(guild.id), ...valid);
		}
		messageParts.push(CONFIG_CHANNELS_CHANGED(action, valid.map((c) => formatChannelMentions(c)).join(', ')));
	} else {
		messageParts.push(CONFIG_CHANNELS_NONE(action));
	}

	if (wrongTpye.length) {
		const wrongTypeFormatted = wrongTpye.map((c) => formatChannelMentions(c)).join(', ');
		messageParts.push(CONFIG_CHANNELS_WRONG_TYPE(action, wrongTypeFormatted));
	}

	return interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
