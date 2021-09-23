import { ApplicationCommandOptionType } from 'discord-api-types/v9';
export const SetCommandsCommand = {
	type: 1,
	name: 'set-commands',
	description: '🔧 Set commands for a guild',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'guild',
			description: 'Guild to target',
			required: true,
		},
	],
} as const;
