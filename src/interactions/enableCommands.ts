import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const EnableCommandsCommand = {
	name: 'enable-commands',
	description: '🔧 Set command permissions on a guild for users and roles',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'guild',
			description: 'Guild to target',
			required: true,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: 'commands',
			description: 'Commands to target',
		},
		{
			type: ApplicationCommandOptionType.String,
			name: 'users',
			description: 'Users to enable the command for',
		},
		{
			type: ApplicationCommandOptionType.String,
			name: 'roles',
			description: 'Roles to enable the command for',
		},
	],
} as const;
