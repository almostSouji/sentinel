import { CommandInteraction, Role } from 'discord.js';
import { NOTIF_ROLES, NOTIF_USERS } from '../keys';
import {
	NOTIFY_NONE,
	NOTIFY_ROLE_ADD,
	NOTIFY_ROLE_REMOVE,
	NOTIFY_ROLE_SHOW,
	NOTIFY_USER_ADD,
	NOTIFY_USER_REMOVE,
	NOTIFY_USER_SHOW,
	NOT_IN_DM,
} from '../messages/messages';
import { zSetZipper } from '../functions/util';
import { NotifyCommand } from '../interactions/notify';
import { ArgumentsOf } from '../types/ArgumentsOf';

export function levelIdentifier(level: number): string {
	return `\`${level === 3 ? 'SEVERE' : level === 2 ? 'HIGH' : level === 1 ? 'LOW' : 'CUSTOM'} ${
		level === 3 ? '🔴' : level === 2 ? '🟡' : level === 1 ? '🟢' : '🔵'
	}\``;
}

export async function handleNotifyCommand(interaction: CommandInteraction, args: ArgumentsOf<typeof NotifyCommand>) {
	const messageParts = [];

	const {
		client: { redis },
		guildID,
		guild,
	} = interaction;

	if (!guildID || !guild) {
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});
	}

	const action = Object.keys(args)[0] as keyof ArgumentsOf<typeof NotifyCommand>;
	switch (action) {
		case 'add':
			{
				const entity = args.add.entity!;
				const level = args.add.level!;
				const levelId = levelIdentifier(level);
				if (entity instanceof Role) {
					await redis.zadd(NOTIF_ROLES(guildID), level, entity.id);
					messageParts.push(NOTIFY_ROLE_ADD(entity.id, levelId));
				} else {
					await redis.zadd(NOTIF_USERS(guildID), level, entity.user.id);
					messageParts.push(NOTIFY_USER_ADD(levelId, entity.user.id));
				}
			}
			break;

		case 'remove':
			{
				const entity = args.remove.entity!;
				if (entity instanceof Role) {
					await redis.zrem(NOTIF_ROLES(guildID), entity.id);
					messageParts.push(NOTIFY_ROLE_REMOVE(entity.id));
				} else {
					await redis.zrem(NOTIF_USERS(guildID), entity.user.id);
					messageParts.push(NOTIFY_USER_REMOVE(entity.user.id));
				}
			}
			break;
		case 'show':
			{
				const notifUsers = await redis.zrange(NOTIF_USERS(guildID), 0, -1, 'WITHSCORES');
				const notifRoles = await redis.zrange(NOTIF_ROLES(guildID), 0, -1, 'WITHSCORES');

				if (notifUsers.length || notifRoles.length) {
					const userMap = zSetZipper(notifUsers);
					const roleMap = zSetZipper(notifRoles);

					for (const [id, level] of userMap) {
						const levelId = levelIdentifier(level);
						messageParts.push(NOTIFY_USER_SHOW(id, levelId));
					}

					for (const [id, level] of roleMap) {
						const levelId = levelIdentifier(level);
						messageParts.push(NOTIFY_ROLE_SHOW(id, levelId));
					}
				} else {
					messageParts.push(NOTIFY_NONE);
				}
			}
			break;
	}

	return interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
