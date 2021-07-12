export const WatchCommand = {
	name: 'watch',
	description: 'Edit which channels are watched',
	default_permission: false,
	options: [
		{
			type: 1,
			name: 'add',
			description: 'Specify channels the application should watch',
			options: [
				{
					type: 7,
					name: 'channel-1',
					description: 'Channel to add to the watch list',
					required: true,
				},
				{
					type: 7,
					name: 'channel-2',
					description: 'Channel to add to the watch list',
				},
				{
					type: 7,
					name: 'channel-3',
					description: 'Channel to add to the watch list',
				},
				{
					type: 7,
					name: 'channel-4',
					description: 'Channel to add to the watch list',
				},
				{
					type: 7,
					name: 'channel-5',
					description: 'Channel to add to the watch list',
				},
			],
		},
		{
			type: 1,
			name: 'remove',
			description: 'Specify channels the application should no longer watch',
			options: [
				{
					type: 7,
					name: 'channel-1',
					description: 'Channel to remove from the watch list',
					required: true,
				},
				{
					type: 7,
					name: 'channel-2',
					description: 'Channel to remove from the watch list',
				},
				{
					type: 7,
					name: 'channel-3',
					description: 'Channel to remove from the watch list',
				},
				{
					type: 7,
					name: 'channel-4',
					description: 'Channel to remove from the watch list',
				},
				{
					type: 7,
					name: 'channel-5',
					description: 'Channel to remove from the watch list',
				},
			],
		},
	],
} as const;
