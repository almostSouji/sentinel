import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const CustomTriggerCommand = {
	name: 'custom',
	description: 'Show or edit custom triggers',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.SubCommand,
			name: 'add',
			description: 'Add a custom trigger',
			options: [
				{
					type: ApplicationCommandOptionType.Integer,
					name: 'mode',
					description: 'If a whole word or part of a phrase should match',
					required: true,
					choices: [
						{
							name: 'phrase',
							value: 1,
						},
						{
							name: 'word',
							value: 2,
						},
					],
				},
				{
					type: ApplicationCommandOptionType.String,
					name: 'trigger',
					description: 'Phrase or word to match',
					required: true,
				},
				{
					type: ApplicationCommandOptionType.Integer,
					name: 'level',
					description: 'Log severity the phrase or word should trigger',
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
			type: ApplicationCommandOptionType.SubCommand,
			name: 'remove',
			description: 'Remove a custom trigger',
			options: [
				{
					type: ApplicationCommandOptionType.Integer,
					name: 'mode',
					description: 'If a whole word or part of a phrase is matched',
					required: true,
					choices: [
						{
							name: 'phrase',
							value: 1,
						},
						{
							name: 'word',
							value: 2,
						},
					],
				},
				{
					type: ApplicationCommandOptionType.String,
					name: 'trigger',
					description: 'Phrase or word to match',
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.SubCommand,
			name: 'show',
			description: 'Show custom triggers',
		},
	],
} as const;
