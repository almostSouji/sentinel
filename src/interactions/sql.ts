import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const SQLCommand = {
	type: 1,
	name: 'sql',
	description: '🔧 Execute sql query',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'query',
			description: 'Query to execute',
			required: true,
		},
	],
} as const;
