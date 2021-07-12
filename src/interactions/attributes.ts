export const AttributesCommand = {
	name: 'attributes',
	description: 'Configure which attributes are tracked',
	default_permissions: false,
	options: [
		{
			name: 'toxicity',
			description: 'Check for toxicity',
			type: 5,
		},
		{
			name: 'insult',
			description: 'Check for insults',
			type: 5,
		},
		{
			name: 'profanity',
			description: 'Check for profanity',
			type: 5,
		},
		{
			name: 'threat',
			description: 'Check for threats',
			type: 5,
		},
		{
			name: 'sexually-explicit',
			description: 'Check for sexually explicitness',
			type: 5,
		},
		{
			name: 'flirtation',
			description: 'Check for flirtation',
			type: 5,
		},
	],
} as const;
