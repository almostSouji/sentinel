import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const NYTAttributesCommand = {
	name: 'attributes-nyt',
	description: 'Configure which attributes of the New York Times set are tracked (trained on a comment section)',
	default_permission: false,
	options: [
		{
			name: 'attack-on-author',
			description: 'Check for an attack on the author 🗞️',
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'attack-on-commenter',
			description: 'Check for an attack on a commenter 🗞️',
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'incoherent',
			description: 'Check for incoherent messages 🗞️',
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'inflammatory',
			description: 'Check for inflammatory messages 🗞️',
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'likely-to-reject',
			description: 'Check for messages that are likely to be rejected 🗞️',
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'spam',
			description: 'Check for spam 🗞️',
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'unsubstantial',
			description: 'Check for unsubstantial messages 🗞️',
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'obscene',
			description: 'Check for obscenity 🗞️ (🔞 not in NSFW)',
			type: ApplicationCommandOptionType.Boolean,
		},
	],
} as const;
