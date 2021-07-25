import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const AttributesCommand = {
	name: 'attributes',
	description: 'Configure which attributes are tracked',
	default_permission: false,
	options: [
		{
			name: 'toxicity',
			description: 'Check for toxicity',
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'insult',
			description: 'Check for insults',
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'profanity',
			description: 'Check for profanity',
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'threat',
			description: 'Check for threats',
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'sexually-explicit',
			description: 'Check for sexually explicitness',
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'flirtation',
			description: 'Check for flirtation',
			type: ApplicationCommandOptionType.Boolean,
		},
	],
} as const;
