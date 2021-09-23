import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const KarmaCommand = {
	type: 1,
	name: 'karma',
	description: 'Show user karma',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.User,
			name: 'user',
			description: 'User to show karma for',
			required: false, // required to be false because of context command handling
		},
	],
} as const;
