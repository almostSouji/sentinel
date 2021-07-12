export const TestCommand = {
	name: 'test',
	description: 'Check a string for toxicity and custom triggers',
	default_permission: false,
	options: [
		{
			type: 3,
			name: 'query',
			description: 'Phrase to test',
			required: true,
		},
	],
} as const;
