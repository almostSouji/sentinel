import { CommandInteraction } from 'discord.js';
import { COMMAND_NAME_ATTRIBUTES, COMMAND_NAME_ATTRIBUTES_NYT } from '../../constants';
import { ATTRIBUTES_NYT } from '../../keys';
import { CONFIG_ATTRIBUTES_ENABLED, CONFIG_ATTRIBUTES_DISABLED, NOT_IN_DM } from '../../messages/messages';
import { logger } from '../logger';

function formatFlag(flag: string): string {
	return flag.replaceAll('-', '_').toUpperCase();
}

export function attributes(interaction: CommandInteraction) {
	const messageParts = [];

	logger.debug(interaction);
	const {
		options,
		client: { redis },
		guildID,
		guild,
		commandName,
	} = interaction;

	if (!guildID || !guild) {
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});
	}

	if (commandName === COMMAND_NAME_ATTRIBUTES) {
		const [enabled, disabled] = options.partition((v) => v.value as boolean);
		if (enabled.size) {
			const enabledFlags = enabled.map((v) => formatFlag(v.name));
			void redis.sadd(ATTRIBUTES_NYT(guildID), ...enabledFlags);
			messageParts.push(CONFIG_ATTRIBUTES_ENABLED(enabledFlags.map((f) => `\`${f}\``).join(', ')));
		}
		if (disabled.size) {
			const disabledFlags = disabled.map((v) => formatFlag(v.name));
			void redis.sadd(ATTRIBUTES_NYT(guildID), ...disabledFlags);
			messageParts.push(CONFIG_ATTRIBUTES_DISABLED(disabledFlags.map((f) => `\`${f}\``).join(', ')));
		}
	}

	if (commandName === COMMAND_NAME_ATTRIBUTES_NYT) {
		const [enabled, disabled] = options.partition((v) => v.value as boolean);
		if (enabled.size) {
			const enabledFlags = enabled.map((v) => formatFlag(v.name));
			void redis.sadd(ATTRIBUTES_NYT(guildID), ...enabledFlags);
			messageParts.push(CONFIG_ATTRIBUTES_ENABLED(enabledFlags.map((f) => `\`${f}\``).join(', ')));
		}
		if (disabled.size) {
			const disabledFlags = disabled.map((v) => formatFlag(v.name));
			void redis.sadd(ATTRIBUTES_NYT(guildID), ...disabledFlags);
			messageParts.push(CONFIG_ATTRIBUTES_DISABLED(disabledFlags.map((f) => `\`${f}\``).join(', ')));
		}
	}

	void interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
