import { CommandInteraction, MessageActionRow, MessageEmbed, MessageSelectMenu } from 'discord.js';
import { ArgumentsOf } from '../../../types/ArgumentsOf';
import {
	CID_SEPARATOR,
	COLOR_DARK,
	EMOJI_ID_SHIELD_GREEN_SMALL,
	EMOJI_ID_SHIELD_RED_SMALL,
	LIST_BULLET,
} from '../../../utils/constants';
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

	const owner = await targetGuild.fetchOwner();

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

		const parts = [];
		const createdSeconds = Math.trunc(targetGuild.createdTimestamp / 1000);
		const joinedSeconds = Math.trunc(targetGuild.joinedTimestamp / 1000);

		parts.push(`${LIST_BULLET} Guild available: ${inlineCode(String(targetGuild.available))}`);
		parts.push(`${LIST_BULLET} Description.: ${inlineCode(String(targetGuild.description))}`);
		parts.push(`${LIST_BULLET} Created: <t:${createdSeconds}:f> (<t:${createdSeconds}:R>)`);
		parts.push(`${LIST_BULLET} Joined: <t:${joinedSeconds}:f> (<t:${joinedSeconds}:R>)`);
		parts.push(`${LIST_BULLET} Member count: ${inlineCode(String(targetGuild.memberCount))}`);
		parts.push(`${LIST_BULLET} Approx. member count: ${inlineCode(String(targetGuild.approximateMemberCount))}`);
		parts.push(`${LIST_BULLET} Approx. presence count: ${inlineCode(String(targetGuild.approximatePresenceCount))}`);
		parts.push(`${LIST_BULLET} Max. members: ${inlineCode(String(targetGuild.maximumMembers))}`);
		parts.push(`${LIST_BULLET} Max. presences: ${inlineCode(String(targetGuild.maximumPresences))}`);
		parts.push(`${LIST_BULLET} ExplicitContentFilter: ${inlineCode(String(targetGuild.explicitContentFilter))}`);
		parts.push(`${LIST_BULLET} NSFW level: ${inlineCode(String(targetGuild.nsfwLevel))}`);
		parts.push(`${LIST_BULLET} Verification level: ${inlineCode(String(targetGuild.verificationLevel))}`);
		parts.push(`${LIST_BULLET} Default message notif.: ${inlineCode(String(targetGuild.defaultMessageNotifications))}`);
		parts.push(`${LIST_BULLET} Features: ${targetGuild.features.map((f) => inlineCode(f)).join(', ')}`);
		parts.push(`${LIST_BULLET} MFA: ${inlineCode(targetGuild.mfaLevel)}`);
		parts.push(`${LIST_BULLET} Acronym: ${inlineCode(targetGuild.nameAcronym)}`);
		parts.push(`${LIST_BULLET} Preferred locale: ${inlineCode(targetGuild.preferredLocale ?? 'none')}`);
		parts.push(
			`${LIST_BULLET} Premium subscription count: ${inlineCode(String(targetGuild.premiumSubscriptionCount ?? 0))}`,
		);
		parts.push(`${LIST_BULLET} Premium tier: ${inlineCode(targetGuild.premiumTier)}`);
		parts.push(`${LIST_BULLET} Vanity: ${inlineCode(targetGuild.vanityURLCode ?? 'none')}`);
		parts.push(`${LIST_BULLET} Vanity users: ${inlineCode(String(targetGuild.vanityURLUses ?? 0))}`);

		await interaction.editReply({
			content: `Guild settings for ${inlineCode(targetGuild.name)} ${inlineCode(targetGuild.id)}:`,
			embeds: [
				new MessageEmbed()
					.setColor(COLOR_DARK)
					.setDescription(parts.join('\n'))
					.setFooter(`Owner: ${owner.user.tag} (${owner.displayName})`, owner.user.displayAvatarURL({ dynamic: true }))
					.setAuthor(`${targetGuild.name} (${targetGuild.id})`, targetGuild.iconURL({ dynamic: true }) ?? undefined)
					.setThumbnail(targetGuild.bannerURL() ?? ''),
			],
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
