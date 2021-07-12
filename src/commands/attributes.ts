import { CommandInteraction } from 'discord.js';
import { ArgumentsOf } from '../types/ArgumentsOf';
import { AttributesCommand } from '../interactions/attributes';
import { ATTRIBUTES } from '../keys';
import {
	NOT_IN_DM,
	CONFIG_ATTRIBUTES_ENABLED,
	CONFIG_ATTRIBUTES_DISABLED,
	CONFIG_ATTRIBUTES_NONE,
} from '../messages/messages';

export function formatFlag(flag: string): string {
	return flag.replaceAll('-', '_').toUpperCase();
}

export async function handleAttributesCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof AttributesCommand>,
) {
	const messageParts = [];

	const {
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
	const enabled: (keyof ArgumentsOf<typeof AttributesCommand>)[] = [];
	const disabled: (keyof ArgumentsOf<typeof AttributesCommand>)[] = [];

	for (const [key, value] of Object.entries(args)) {
		const k = key as keyof ArgumentsOf<typeof AttributesCommand>;
		(value ? enabled : disabled).push(k);
	}

	if (enabled.length) {
		const enabledFlags = enabled.map((v) => formatFlag(v));
		await redis.sadd(ATTRIBUTES(guildID), ...enabledFlags);
		messageParts.push(CONFIG_ATTRIBUTES_ENABLED(enabledFlags.map((f) => `\`${f}\``).join(', ')));
	} else if (disabled.length) {
		const disabledFlags = disabled.map((v) => formatFlag(v));
		await redis.srem(ATTRIBUTES(guildID), ...disabledFlags);
		messageParts.push(CONFIG_ATTRIBUTES_DISABLED(disabledFlags.map((f) => `\`${f}\``).join(', ')));
	} else {
		messageParts.push(CONFIG_ATTRIBUTES_NONE);
	}

	return interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
