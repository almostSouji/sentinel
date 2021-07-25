import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const TestCommand = {
	name: 'test',
	description: 'Check a string for toxicity and custom triggers',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'query',
			description: 'Phrase to test',
			required: false, // required to be false because of context command handling
		},
	],
} as const;
