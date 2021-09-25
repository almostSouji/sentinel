import { CommandInteraction, MessageActionRow, MessageSelectMenu } from 'discord.js';
import { ArgumentsOf } from '../../../types/ArgumentsOf';
import { emojiOrFallback } from '../../../utils';
import {
	CID_SEPARATOR,
	EMOJI_ID_SHIELD_GREEN_SMALL,
	EMOJI_ID_SHIELD_RED_SMALL,
	LIST_BULLET,
} from '../../../utils/constants';
import { formatEmoji, inlineCode } from '@discordjs/builders';
import { SetCommandsCommand } from '../../../interactions/setCommands';
import { logger } from '../../../utils/logger';
import { AttributesCommand } from '../../../interactions/attributes';
import { ConfigCommand } from '../../../interactions/config';
import { EvaluateContentCommand } from '../../../interactions/evaluateContent';
import { EvaluateContentContextCommand } from '../../../interactions/evaluateContentContext';
import { FetchLogCommand } from '../../../interactions/fetchLog';
import { KarmaCommand } from '../../../interactions/karma';
import { KarmaContextCommand } from '../../../interactions/karmacontext';
import { NotifyCommand } from '../../../interactions/notify';
import { NYTAttributesCommand } from '../../../interactions/nytAttributes';
import { RedisCommand } from '../../../interactions/redis';
import { SetPermissionsCommand } from '../../../interactions/setPermissions';
import { SQLCommand } from '../../../interactions/sql';
import { WatchCommand } from '../../../interactions/watch';
import { OpCodes } from '../../..';
import { DebugCommand } from '../../../interactions/debug';

export const defaultCommands = [ConfigCommand, WatchCommand, AttributesCommand, NotifyCommand, EvaluateContentCommand];

// 🧪 in-dev feature, experimental
export const additionalCommands = [
	EvaluateContentContextCommand,
	KarmaCommand,
	KarmaContextCommand,
	NYTAttributesCommand,
];

// ! 🔧 devcommand, not for public use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const devCommands = [
	FetchLogCommand,
	RedisCommand,
	SQLCommand,
	SetPermissionsCommand,
	SetCommandsCommand,
	DebugCommand,
];

export async function handleSetCommandsCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof SetCommandsCommand>,
): Promise<void> {
	const {
		client: { guilds },
		channel,
	} = interaction;

	if (!channel || channel.partial) {
		return;
	}

	const failEmoji = emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_RED_SMALL), LIST_BULLET);

	await interaction.deferReply({ ephemeral: true });

	const targetGuild = guilds.resolve(args.guild);

	if (!targetGuild) {
		// - cannot resolve guild
		await interaction.editReply({
			content: 'Cannot resolve input to target guild.',
		});
		return;
	}

	const messageParts = [];

	try {
		const currentCommands = await targetGuild.commands.fetch();

		await interaction.editReply({
			content: `Select which commands should be enabled on guild ${inlineCode(targetGuild.name)} ${inlineCode(
				targetGuild.id,
			)}`,
			components: [
				new MessageActionRow().addComponents(
					new MessageSelectMenu()
						.setCustomId(String(`${OpCodes.SET_COMMANDS_SELECT}${CID_SEPARATOR}${targetGuild.id}`))
						.setPlaceholder('Select Commands...')
						.setMinValues(0)
						.setMaxValues(defaultCommands.length + additionalCommands.length)
						.addOptions(
							[...defaultCommands, ...additionalCommands].map((c) => {
								const isCurrent = currentCommands.some((com) => com.name === c.name);
								const isExperiment = additionalCommands.some((com) => com.name === c.name);
								return {
									value: c.name,
									emoji: isCurrent ? EMOJI_ID_SHIELD_GREEN_SMALL : EMOJI_ID_SHIELD_RED_SMALL,
									label: `${isExperiment ? '🧪 ' : ''}${c.name}`,
									default: isCurrent,
									description:
										c.type === 1
											? c.description.slice(0, 100)
											: `type: ${c.type === 2 ? 'user' : 'message'} context menu`,
								};
							}),
						),
				),
			],
		});
	} catch (error: any) {
		logger.error(error, error.message);
		messageParts.push(`${failEmoji} ${error as string}`);
	}
}
