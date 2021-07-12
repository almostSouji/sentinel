export const RedisCommand = {
	name: 'redis',
	description: '🔧 Execute redis query',
	default_permission: false,
	options: [
		{
			type: 3,
			name: 'query',
			description: 'Query to execute',
			required: true,
		},
	],
} as const;
