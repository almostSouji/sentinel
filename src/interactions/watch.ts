import { ApplicationCommandOptionType } from 'discord-api-types/v9';

export const WatchCommand = {
	name: 'watch',
	description: 'Edit which channels are watched',
	default_permission: false,
	options: [
		{
			type: ApplicationCommandOptionType.SubCommand,
			name: 'add',
			description: 'Specify channels the application should watch',
			options: [
				{
					type: ApplicationCommandOptionType.Channel,
					name: 'channel-1',
					description: 'Channel to add to the watch list',
					required: true,
				},
				{
					type: ApplicationCommandOptionType.Channel,
					name: 'channel-2',
					description: 'Channel to add to the watch list',
				},
				{
					type: ApplicationCommandOptionType.Channel,
					name: 'channel-3',
					description: 'Channel to add to the watch list',
				},
				{
					type: ApplicationCommandOptionType.Channel,
					name: 'channel-4',
					description: 'Channel to add to the watch list',
				},
				{
					type: ApplicationCommandOptionType.Channel,
					name: 'channel-5',
					description: 'Channel to add to the watch list',
				},
			],
		},
		{
			type: ApplicationCommandOptionType.SubCommand,
			name: 'remove',
			description: 'Specify channels the application should no longer watch',
			options: [
				{
					type: ApplicationCommandOptionType.Channel,
					name: 'channel-1',
					description: 'Channel to remove from the watch list',
					required: true,
				},
				{
					type: ApplicationCommandOptionType.Channel,
					name: 'channel-2',
					description: 'Channel to remove from the watch list',
				},
				{
					type: ApplicationCommandOptionType.Channel,
					name: 'channel-3',
					description: 'Channel to remove from the watch list',
				},
				{
					type: ApplicationCommandOptionType.Channel,
					name: 'channel-4',
					description: 'Channel to remove from the watch list',
				},
				{
					type: ApplicationCommandOptionType.Channel,
					name: 'channel-5',
					description: 'Channel to remove from the watch list',
				},
			],
		},
	],
} as const;
