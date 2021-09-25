import { inlineCode } from '@discordjs/builders';
import { Guild, MessageActionRow, MessageSelectMenu, SelectMenuInteraction } from 'discord.js';
import { OpCodes } from '..';
import { GuildSettingFlags } from '../types/DataTypes';
import { CID_SEPARATOR, EMOJI_ID_SHIELD_GREEN_SMALL, EMOJI_ID_SHIELD_RED_SMALL, LIST_BULLET } from '../utils/constants';
import { logger } from '../utils/logger';

export async function handleDebugSelect(interaction: SelectMenuInteraction, guild: Guild) {
	const {
		client: { sql },
	} = guild;
	try {
		await interaction.deferUpdate();
		await sql`update guild_settings set flags = ${sql.array(interaction.values)} where guild = ${guild.id}`;

		const possibleFlags = [...new Set([...interaction.values, ...Object.keys(GuildSettingFlags)])];

		await interaction.editReply({
			content: `Set flags on guild ${inlineCode(guild.name)} ${inlineCode(guild.id)}:\n${interaction.values
				.map((v) => `${LIST_BULLET} ${v}`)
				.join('\n')}`,
			components: [
				new MessageActionRow().addComponents(
					new MessageSelectMenu()
						.setCustomId(String(`${OpCodes.DEBUG_SELECT}${CID_SEPARATOR}${guild.id}`))
						.setPlaceholder('Select Flags...')
						.setMinValues(0)
						.setMaxValues(possibleFlags.length)
						.addOptions(
							possibleFlags.map((flag) => {
								const isCurrent = interaction.values.includes(flag);
								const description =
									flag === GuildSettingFlags.DEBUG
										? 'Log debug information for flags to consoles'
										: flag === GuildSettingFlags.LOG_ALL
										? 'Override: Track all attributes for this guild'
										: flag === GuildSettingFlags.PERSPECTIVE_FEEDBACK
										? 'Allow perspective feedback on the guild'
										: 'No description found';
								return {
									value: flag,
									emoji: isCurrent ? EMOJI_ID_SHIELD_GREEN_SMALL : EMOJI_ID_SHIELD_RED_SMALL,
									label: flag,
									default: isCurrent,
									description,
								};
							}),
						),
				),
			],
		});
	} catch (error: any) {
		logger.error(error, error.message);
	}
}
