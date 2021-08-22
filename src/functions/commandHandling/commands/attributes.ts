import { CommandInteraction, DMChannel } from 'discord.js';
import { ArgumentsOf } from '../../../types/ArgumentsOf';
import { AttributesCommand } from '../../../interactions/attributes';
import { GuildSettings } from '../../../types/DataTypes';
import i18next from 'i18next';
import { formatFlag, formatFlagString } from '../../../utils/formatting';
import { replyWithError } from '../../../utils/responses';
import { emojiOrFallback } from '../../../utils';
import { EMOJI_ID_SHIELD_GREEN_SMALL, EMOJI_ID_SHIELD_YELLOW_SMALL, LIST_BULLET } from '../../../utils/constants';
import { NYTAttributesCommand } from '../../../interactions/nytAttributes';
import { formatEmoji, inlineCode } from '@discordjs/builders';

export async function handleAttributesCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof AttributesCommand> | ArgumentsOf<typeof NYTAttributesCommand>,
	locale: string,
) {
	const {
		client: { sql },
		guild,
		channel,
	} = interaction;

	if (!channel || channel.partial) {
		return;
	}
	const successEmoji = emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_GREEN_SMALL), LIST_BULLET);
	const warnEmoji = emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_YELLOW_SMALL), LIST_BULLET);

	if (!guild || channel instanceof DMChannel) {
		return replyWithError(interaction, i18next.t('common.errors.not_in_dm', { lng: locale }));
	}

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

	const alreadyEnabled = [];
	const alreadyDisabled = [];
	const newEnabled = [];
	const newDisabled: string[] = [];

	for (const [key, value] of Object.entries(args)) {
		const k = formatFlag(key);
		if (value) {
			if (settings.attributes.includes(k)) {
				alreadyEnabled.push(k);
			} else {
				newEnabled.push(k);
			}
		} else if (settings.attributes.includes(k)) {
			newDisabled.push(k);
		} else {
			alreadyDisabled.push(k);
		}
	}

	const messageParts = [];

	if (!newEnabled.length && !newDisabled.length) {
		messageParts.push(
			`${warnEmoji}${i18next.t('command.attributes.nothing_changed', {
				lng: locale,
			})}`,
		);
	} else {
		settings.attributes = settings.attributes.filter((a) => !newDisabled.includes(a)).concat(newEnabled);

		await sql`
			update guild_settings set attributes = ${sql.array(settings.attributes)}
			where guild = ${settings.guild}
		`;
	}

	if (newEnabled.length) {
		messageParts.push(
			`${successEmoji}${i18next.t('command.attributes.new_enabled', {
				count: newEnabled.length,
				flags: newEnabled.map((f) => inlineCode(formatFlagString(f))).join(', '),
				lng: locale,
			})}`,
		);
	}

	if (newDisabled.length) {
		messageParts.push(
			`${successEmoji}${i18next.t('command.attributes.new_disabled', {
				count: newDisabled.length,
				flags: newDisabled.map((f) => inlineCode(formatFlagString(f))).join(', '),
				lng: locale,
			})}`,
		);
	}

	if (alreadyEnabled.length) {
		messageParts.push(
			`${warnEmoji}${i18next.t('command.attributes.already_enabled', {
				count: alreadyEnabled.length,
				lng: locale,
				flags: alreadyEnabled.map((f) => inlineCode(formatFlagString(f))).join(', '),
			})}`,
		);
	}

	if (alreadyDisabled.length) {
		messageParts.push(
			i18next.t('command.attributes.already_disabled', {
				count: alreadyDisabled.length,
				lng: locale,
				flags: alreadyDisabled.map((f) => inlineCode(formatFlagString(f))).join(', '),
			}),
		);
	}

	return interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
