import { CommandInteraction } from 'discord.js';
import { ATTRIBUTES } from '../../keys';
import {
	CONFIG_ATTRIBUTES_ENABLED,
	CONFIG_ATTRIBUTES_DISABLED,
	NOT_IN_DM,
	CONFIG_SHOW_ATTRIBUTES,
	CONFIG_SHOW_ATTRIBUTES_NONE,
} from '../../messages/messages';

function formatFlag(flag: string): string {
	return flag.replaceAll('-', '_').toUpperCase();
}

export async function attributes(interaction: CommandInteraction) {
	const messageParts = [];

	const {
		options,
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

	const [enabled, disabled] = options.partition((v) => v.value as boolean);
	if (enabled.size) {
		const enabledFlags = enabled.map((v) => formatFlag(v.name));
		void redis.sadd(ATTRIBUTES(guildID), ...enabledFlags);
		messageParts.push(CONFIG_ATTRIBUTES_ENABLED(enabledFlags.map((f) => `\`${f}\``).join(', ')));
	} else if (disabled.size) {
		const disabledFlags = disabled.map((v) => formatFlag(v.name));
		void redis.sadd(ATTRIBUTES(guildID), ...disabledFlags);
		messageParts.push(CONFIG_ATTRIBUTES_DISABLED(disabledFlags.map((f) => `\`${f}\``).join(', ')));
	} else {
		const attributes = await redis.smembers(ATTRIBUTES(guildID));

		const flags = attributes.map((a) => `\`${a}\``);
		if (flags.length) {
			messageParts.push(CONFIG_SHOW_ATTRIBUTES(flags.join(', ')));
		} else {
			messageParts.push(CONFIG_SHOW_ATTRIBUTES_NONE);
		}
	}

	void interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
