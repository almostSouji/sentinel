import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const NotifyCommand = {
	name: 'notify',
	description: 'Show or edit server notifications',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'add',
			description: 'Add a notification',
			options: [
				{
					type: ApplicationCommandOptionType.Mentionable,
					name: 'entity',
					description: 'User or role to notify',
					required: true,
				},
				{
					type: ApplicationCommandOptionType.Integer,
					name: 'level',
					description: 'Log severity the user or role should be notified at',
					required: true,
					choices: [
						{
							name: 'Low (green)',
							value: 1,
						},
						{
							name: 'High (yellow)',
							value: 2,
						},
						{
							name: 'Severe (red)',
							value: 3,
						},
						{
							name: 'Custom (purple)',
							value: 4,
						},
					],
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'remove',
			description: 'Remove a notification',
			options: [
				{
					type: ApplicationCommandOptionType.Mentionable,
					name: 'entity',
					description: 'User or role to no longer notify',
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'show',
			description: 'Show notifications',
		},
	],
} as const;
