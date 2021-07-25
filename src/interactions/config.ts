import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const ConfigCommand = {
	name: 'config',
	description: 'Show or edit server configuration',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.Channel,
			name: 'logchannel',
			description: 'Channel to log in',
		},
		{
			type: ApplicationCommandOptionType.Integer,
			name: 'strictness',
			description: 'How strict you want the application to be',
			choices: [
				{
					name: 'Forgiving (default)',
					value: 1,
				},
				{
					name: 'Medium',
					value: 2,
				},
				{
					name: 'Very strict',
					value: 3,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Integer,
			name: 'prefetch',
			description: 'Amount of messages in the log channel to cache after a restart',
			choices: [
				{
					name: '0 (default)',
					value: 0,
				},
				{
					name: '100',
					value: 100,
				},
				{
					name: '200',
					value: 200,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Integer,
			name: 'immunity',
			description: 'Ignore members with this permission',
			choices: [
				{
					name: "Don't ignore anyone (default)",
					value: 0,
				},
				{
					name: 'Manage messages',
					value: 1,
				},
				{
					name: 'Ban members',
					value: 2,
				},
				{
					name: 'Administrator',
					value: 3,
				},
			],
		},
	],
} as const;
