import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const FetchLogCommand = {
	name: 'fetchlog',
	description: '🔧 Fetch log entries from anywhere',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'link',
			description: 'Link to the log message that should be fetched',
			required: true,
		},
	],
} as const;
