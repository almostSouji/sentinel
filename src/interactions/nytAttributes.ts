export const NYTAttributesCommand = {
	name: 'attributes-nyt',
	description: 'Configure which attributes of the New York Times set are tracked (trained on a comment section)',
	default_permission: false,
	options: [
		{
			name: 'attack-on-author',
			description: 'Check for an attack on the author',
			type: 5,
		},
		{
			name: 'attack-on-commenter',
			description: 'Check for an attack on a commenter',
			type: 5,
		},
		{
			name: 'incoherent',
			description: 'Check for incoherent messages',
			type: 5,
		},
		{
			name: 'inflammatory',
			description: 'Check for inflammatory messages',
			type: 5,
		},
		{
			name: 'likely-to-reject',
			description: 'Check for messages that are likely to be rejected',
			type: 5,
		},
		{
			name: 'obscene',
			description: 'Check for obscenity',
			type: 5,
		},
		{
			name: 'spam',
			description: 'Check for spam',
			type: 5,
		},
		{
			name: 'unsubstantial',
			description: 'Check for unsubstantial messages',
			type: 5,
		},
	],
} as const;
