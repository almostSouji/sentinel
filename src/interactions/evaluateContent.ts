import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const EvaluateContentCommand = {
	name: 'evaluate-content',
	description: 'Evaluate a phrase for tracked attributes and custom triggers',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'query',
			description: 'Phrase to test',
			required: true,
		},
	],
} as const;
