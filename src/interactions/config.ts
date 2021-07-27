import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const ConfigCommand = {
	name: 'config',
	description: 'Edit server configuration (provide no options to show current config)',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.Channel,
			name: 'logchannel',
			description: 'Channel to use as log for flagged messages',
		},
		{
			type: ApplicationCommandOptionType.Integer,
			name: 'strictness',
			description: 'How strict flags should be judged',
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
			description: 'Amount of messages to cache after a restart in the log channel',
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
