export const KarmaCommand = {
	name: 'karma',
	description: 'Show user karma',
	default_permission: false,
	options: [
		{
			type: 6,
			name: 'user',
			description: 'User to show karma for',
			required: true,
		},
	],
} as const;
