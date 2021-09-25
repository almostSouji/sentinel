import { CommandInteraction, MessageActionRow, MessageSelectMenu } from 'discord.js';
import { ArgumentsOf } from '../../../types/ArgumentsOf';
import { CID_SEPARATOR, EMOJI_ID_SHIELD_GREEN_SMALL, EMOJI_ID_SHIELD_RED_SMALL } from '../../../utils/constants';
import { inlineCode } from '@discordjs/builders';
import { logger } from '../../../utils/logger';
import { DebugCommand } from '../../../interactions/debug';
import { GuildSettingFlags, GuildSettings } from '../../../types/DataTypes';
import { inspect } from 'util';
import { OpCodes } from '../../..';

export async function handleDebugCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof DebugCommand>,
): Promise<void> {
	const {
		client: { guilds, sql },
		channel,
	} = interaction;

	if (!channel || channel.partial) {
		return;
	}

	await interaction.deferReply({ ephemeral: true });

	const targetGuild = guilds.resolve(args.guild);

	if (!targetGuild) {
		// - cannot resolve guild
		await interaction.editReply({
			content: 'Cannot resolve input to target guild.',
		});
		return;
	}

	try {
		let [settings] = await sql<GuildSettings[]>`
		select * from guild_settings where guild = ${targetGuild.id}
	`;
		if (!settings) {
			[settings] = await sql<[GuildSettings]>`
			insert into guild_settings ${sql({
				guild: targetGuild.id,
			})} returning *
		`;
		}

		const possibleFlags = [...new Set([...settings.flags, ...Object.keys(GuildSettingFlags)])];

		await interaction.editReply({
			content: `Guild settings for ${inlineCode(targetGuild.name)} ${inlineCode(targetGuild.id)}:`,
			files: [
				{
					attachment: Buffer.from(inspect(settings, { depth: 0, maxArrayLength: Infinity, maxStringLength: Infinity })),
					name: `sentinel_guild_settings_${targetGuild.id}_${Date.now()}.js`,
				},
			],
			components: [
				new MessageActionRow().addComponents(
					new MessageSelectMenu()
						.setCustomId(String(`${OpCodes.DEBUG_SELECT}${CID_SEPARATOR}${targetGuild.id}`))
						.setPlaceholder('Select Flags...')
						.setMinValues(0)
						.setMaxValues(possibleFlags.length)
						.addOptions(
							possibleFlags.map((flag) => {
								const isCurrent = settings.flags.includes(flag);
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
		await interaction.editReply({ content: `Something went wrong: ${inlineCode(error.message)}` });
	}
}
