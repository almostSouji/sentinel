import { GuildChannel, CommandInteraction, Permissions } from 'discord.js';
import { CHANNELS_WATCHING } from '../../keys';
import {
	CONFIG_CHANNELS_ADD_MISSING_PERMISSIONS,
	CONFIG_CHANNELS_ADD_NONE,
	CONFIG_CHANNELS_ADD_WRONG_TYPE,
	CONFIG_CHANNELS_REMOVE_NONE,
	CONFIG_CHANNELS_REMOVE_WRONG_TYPE,
	CONFIG_CHANNEL_ADD,
	NOT_IN_DM,
} from '../../messages/messages';

export function formatChannelMentions(id: string) {
	return `<#${id}>`;
}

export function watchCommand(interaction: CommandInteraction) {
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

	const addOption = options.get('add');
	const removeOption = options.get('remove');
	const missingView = [];
	const wrongTpye = [];

	if (addOption) {
		const add = [];
		for (const option of addOption.options?.values() ?? []) {
			const channel = option.channel as GuildChannel;
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
			add.push(channel.id);
		}

		if (missingView.length) {
			messageParts.push(
				CONFIG_CHANNELS_ADD_MISSING_PERMISSIONS(missingView.map((c) => formatChannelMentions(c)).join(', ')),
			);
		}

		if (wrongTpye.length) {
			messageParts.push(CONFIG_CHANNELS_ADD_WRONG_TYPE(wrongTpye.map((c) => formatChannelMentions(c)).join(', ')));
		}

		if (add.length) {
			void redis.sadd(CHANNELS_WATCHING(guildID), ...add);
			messageParts.push(CONFIG_CHANNEL_ADD(add.map((c) => formatChannelMentions(c)).join(', ')));
		} else {
			messageParts.push(CONFIG_CHANNELS_ADD_NONE);
		}
	}

	if (removeOption) {
		const remove = [];
		for (const option of removeOption.options?.values() ?? []) {
			const channel = option.channel as GuildChannel;
			if (!channel.isText()) {
				wrongTpye.push(channel.id);
				continue;
			}
			remove.push(channel.id);
		}

		if (wrongTpye.length) {
			messageParts.push(CONFIG_CHANNELS_REMOVE_WRONG_TYPE(wrongTpye.map((c) => formatChannelMentions(c)).join(', ')));
		}

		if (remove.length) {
			void redis.srem(CHANNELS_WATCHING(guildID), ...remove);
			messageParts.push(CONFIG_CHANNEL_ADD(remove.map((c) => formatChannelMentions(c)).join(', ')));
		} else {
			messageParts.push(CONFIG_CHANNELS_REMOVE_NONE);
		}
	}

	void interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
