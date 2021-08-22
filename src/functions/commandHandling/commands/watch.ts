import { CategoryChannel, CommandInteraction, DMChannel, GuildChannel, Permissions, ThreadChannel } from 'discord.js';
import { WatchCommand } from '../../../interactions/watch';
import { ArgumentsOf } from '../../../types/ArgumentsOf';
import i18next from 'i18next';
import {
	EMOJI_ID_SHIELD_GREEN_SMALL,
	LIST_BULLET,
	EMOJI_ID_SHIELD_YELLOW_SMALL,
	EMOJI_ID_SHIELD_RED_SMALL,
} from '../../../utils/constants';
import { emojiOrFallback } from '../../../utils';
import { replyWithError } from '../../../utils/responses';
import { GuildSettings } from '../../../types/DataTypes';
import { formatEmoji, channelMention, inlineCode } from '@discordjs/builders';

export async function handleWatchCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof WatchCommand>,
	locale: string,
) {
	const {
		client: { sql },
		client,
		guild,
		channel,
	} = interaction;

	if (!channel || channel.partial) {
		return;
	}
	const successEmoji = emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_GREEN_SMALL), LIST_BULLET);
	const warnEmoji = emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_YELLOW_SMALL), LIST_BULLET);
	const failEmoji = emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_RED_SMALL), LIST_BULLET);

	if (!guild || channel instanceof DMChannel) {
		return replyWithError(interaction, i18next.t('common.errors.not_in_dm', { lng: locale }));
	}

	const messageParts = [];
	const missingView = [];
	const wrongType = [];
	const already = [];
	const threads = [];
	const valid: string[] = [];

	let [settings] = await sql<GuildSettings[]>`
		select * from guild_settings where guild = ${guild.id}
	`;
	if (!settings) {
		[settings] = await sql<[GuildSettings]>`
			insert into guild_settings ${sql({
				guild: guild.id,
			})} returning *
		`;
	}

	const action = Object.keys(args)[0] as keyof ArgumentsOf<typeof WatchCommand>;
	switch (action) {
		case 'add':
			{
				for (const c of Object.values(args.add)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
					const channel = c as GuildChannel;
					if (channel instanceof CategoryChannel) {
						for (const child of channel.children.values()) {
							if (!child.isText() || child instanceof ThreadChannel) continue;
							if (
								!child
									.permissionsFor(client.user!)
									?.has([Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.READ_MESSAGE_HISTORY])
							) {
								missingView.push(child.id);
								continue;
							}

							if (settings.watching.includes(child.id)) {
								already.push(child.id);
								continue;
							}
							valid.push(child.id);
						}
						continue;
					}
					if (channel.isThread()) {
						threads.push(channel.id);
						continue;
					}
					if (!channel.isText()) {
						wrongType.push(channel.id);
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
					if (settings.watching.includes(channel.id)) {
						already.push(channel.id);
						continue;
					}
					valid.push(channel.id);
				}

				if (missingView.length) {
					messageParts.push(
						`${failEmoji} ${i18next.t('command.watch.add_channels_permissions_missing', {
							lng: locale,
							count: missingView.length,
							channels: missingView.map((channelId) => channelMention(channelId)),
						})}`,
					);
				}
			}
			break;

		case 'remove': {
			for (const c of Object.values(args.remove)) {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
				const channel = c as GuildChannel;
				if (channel instanceof CategoryChannel) {
					for (const child of channel.children.values()) {
						if (!child.isText() || child instanceof ThreadChannel) continue;
						if (
							!child
								.permissionsFor(client.user!)
								?.has([Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.READ_MESSAGE_HISTORY])
						) {
							missingView.push(child.id);
							continue;
						}
						if (!settings.watching.includes(child.id)) {
							already.push(child.id);
							continue;
						}
						valid.push(child.id);
					}
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
				if (!settings.watching.includes(channel.id)) {
					already.push(channel.id);
					continue;
				}
				valid.push(channel.id);
			}
		}
	}

	const cleanupChannels: string[] = [];
	const validChannels: string[] = [];

	for (const channel of settings.watching) {
		(guild.channels.resolve(channel) ? validChannels : cleanupChannels).push(channel);
	}

	if (cleanupChannels.length) {
		messageParts.push(
			`${warnEmoji} ${i18next.t('command.config.removed_invalid_channels', {
				channels: cleanupChannels.map((c) => inlineCode(c)).join(', '),
				lng: locale,
			})}`,
		);
		settings.watching = validChannels;
	}

	if (valid.length || cleanupChannels.length) {
		if (valid.length) {
			switch (action) {
				case 'add':
					settings.watching = settings.watching.concat(valid);
					messageParts.push(
						`${successEmoji} ${i18next.t('command.watch.add_channels_valid', {
							lng: locale,
							count: valid.length,
							channels: valid.map((channelId) => channelMention(channelId)),
						})}`,
					);
					break;
				case 'remove':
					settings.watching = settings.watching.filter((c: any) => !valid.includes(c));
					messageParts.push(
						`${successEmoji} ${i18next.t('command.watch.remove_channels_valid', {
							lng: locale,
							count: valid.length,
							channels: valid.map((channelId) => channelMention(channelId)),
						})}`,
					);
			}
		}

		if (!settings.guild) settings.guild = guild.id;

		await sql`
			update guild_settings set watching = ${sql.array(settings.watching)}
			where guild = ${settings.guild};
		`;
	}

	if (wrongType.length) {
		messageParts.push(
			`${failEmoji} ${i18next.t('command.watch.add_channels_wrong_type', {
				lng: locale,
				count: wrongType.length,
				channels: wrongType.map((channelId) => channelMention(channelId)),
			})}`,
		);
	}

	if (threads.length) {
		messageParts.push(
			`${warnEmoji} ${i18next.t('command.watch.add_channels_wrong_type_thread', {
				lng: locale,
				count: threads.length,
				channels: threads.map((channelId) => channelMention(channelId)),
			})}`,
		);
	}

	if (already.length) {
		switch (action) {
			case 'add':
				messageParts.push(
					`${warnEmoji} ${i18next.t('command.watch.add_channels_already', {
						lng: locale,
						count: already.length,
						channels: already.map((channelId) => channelMention(channelId)),
					})}`,
				);
				break;
			case 'remove':
				messageParts.push(
					`${warnEmoji} ${i18next.t('command.watch.remove_channels_already', {
						lng: locale,
						count: already.length,
						channels: already.map((channelId) => channelMention(channelId)),
					})}`,
				);
		}
	}

	if (!messageParts.length) {
		messageParts.push(
			`${warnEmoji} ${i18next.t('command.watch.no_changes', {
				lng: locale,
			})}`,
		);
	}

	return interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
