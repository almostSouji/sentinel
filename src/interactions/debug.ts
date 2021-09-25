import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const DebugCommand = {
	type: 1,
	name: 'debug',
	description: '🔧 Debug guild configuration.',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'guild',
			description: 'Guild to debug',
			required: true,
		},
	],
} as const;
