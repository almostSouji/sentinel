import { CommandInteraction } from 'discord.js';
import { ArgumentsOf } from '../../../types/ArgumentsOf';
import { emojiOrFallback } from '../../../utils';
import { EMOJI_ID_SHIELD_GREEN_SMALL, EMOJI_ID_SHIELD_RED_SMALL, LIST_BULLET } from '../../../utils/constants';
import { formatEmoji, inlineCode } from '@discordjs/builders';
import { EnableCommandsCommand } from '../../../interactions/enableCommands';
import { logger } from '../../../utils/logger';

export async function handleEnableCommandsCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof EnableCommandsCommand>,
): Promise<void> {
	const {
		client: { guilds },
		channel,
	} = interaction;

	if (!channel || channel.partial) {
		return;
	}
	const successEmoji = emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_GREEN_SMALL), LIST_BULLET);
	const failEmoji = emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_RED_SMALL), LIST_BULLET);

	if (!args.roles && !args.users) {
		// - have to provide users or roles
		await interaction.editReply({
			content: 'At least a role or a user is required.',
		});
		return;
	}

	const targetGuild = guilds.resolve(args.guild);

	if (!targetGuild) {
		// - cannot resolve guild
		await interaction.editReply({
			content: 'Cannot resolve input to target guild.',
		});
		return;
	}

	const messageParts = [];
	await interaction.deferReply({
		ephemeral: true,
	});

	try {
		const users = args.users?.split(/[,\s]+/) ?? [];
		const roles = args.roles?.split(/[,\s]+/) ?? [];
		const commandIds = args.commands?.split(/[,\s]+/) ?? [];
		let commands = await targetGuild.commands.fetch();
		commands = commands.filter((c) => !c.description.includes('🔧'));
		if (args.commands) {
			const targetedCommands = commands.filter((c) => commandIds.includes(c.name));
			if (!targetedCommands.size) {
				// - no valid cmds
				await interaction.editReply({
					content: 'No valid commands have been provided',
				});
				return;
			}
			commands = targetedCommands;
		}

		messageParts.push(`On guild ${inlineCode(targetGuild.name)} ${inlineCode(targetGuild.id)}:`);
		messageParts.push(
			`Set the following commands to only be enabled for for roles ${inlineCode(
				roles.length ? roles.join(', ') : 'n/a',
			)} and users ${inlineCode(users.length ? users.join(', ') : 'n/a')}`,
		);
		for (const command of commands.values()) {
			try {
				await command.permissions.set({
					permissions: users
						.map((u) => {
							return {
								id: u,
								type: 'USER' as 'USER' | 'ROLE',
								permission: true,
							};
						})
						.concat(
							roles.map((r) => {
								return {
									id: r,
									type: 'ROLE' as 'USER' | 'ROLE',
									permission: true,
								};
							}),
						),
				});
				messageParts.push(`${successEmoji} enabled ${inlineCode(command.name)}`);
			} catch (error: any) {
				logger.error(error, error.message);
				messageParts.push(`${failEmoji} ${error as string}`);
			}
		}
	} catch (error: any) {
		logger.error(error, error.message);
		messageParts.push(`${failEmoji} ${error as string}`);
	}

	await interaction.editReply({
		content: messageParts.join('\n'),
	});
}
