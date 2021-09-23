import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const FetchLogCommand = {
	type: 1,
	name: 'fetchlog',
	description: '🔧 Fetch log entries from anywhere',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'logmessage',
			description: 'Link to or ID of the log message to fetch',
			required: true,
		},
		{
			type: ApplicationCommandOptionType.Boolean,
			name: 'incident',
			description: 'Whether to include incident data (DB)',
			required: false,
		},
		{
			type: ApplicationCommandOptionType.Boolean,
			name: 'settings',
			description: 'Whether to include guild settings (DB)',
			required: false,
		},
		{
			type: ApplicationCommandOptionType.Boolean,
			name: 'components',
			description: 'Whether to include message payload component data',
			required: false,
		},
	],
} as const;
