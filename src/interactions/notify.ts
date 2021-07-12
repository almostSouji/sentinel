export const NotifyCommand = {
	name: 'notify',
	description: 'Show or edit server configuration',
	default_permission: false,
	options: [
		{
			type: 1,
			name: 'add',
			description: 'Add a notification',
			options: [
				{
					type: 9,
					name: 'entity',
					description: 'User or role to notify',
					required: true,
				},
				{
					type: 4,
					name: 'level',
					description: 'Log severity the user or role should be notified at.',
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
			type: 1,
			name: 'remove',
			description: 'Remove a notification',
			options: [
				{
					type: 9,
					name: 'entity',
					description: 'User or role to no longer notify',
					required: true,
				},
			],
		},
		{
			type: 1,
			name: 'show',
			description: 'Show notifications',
		},
	],
} as const;
