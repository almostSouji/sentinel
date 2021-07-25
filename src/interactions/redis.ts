import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const RedisCommand = {
	name: 'redis',
	description: '🔧 Execute redis query',
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
