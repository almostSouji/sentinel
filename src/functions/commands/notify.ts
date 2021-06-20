import { GuildMember, CommandInteraction, Role } from 'discord.js';
import { NOTIF_ROLES, NOTIF_USERS } from '../../keys';
import {
	NOTIFY_NONE,
	NOTIFY_ROLE_ADD,
	NOTIFY_ROLE_REMOVE,
	NOTIFY_ROLE_SHOW,
	NOTIFY_USER_ADD,
	NOTIFY_USER_REMOVE,
	NOTIFY_USER_SHOW,
	NOT_IN_DM,
} from '../../messages/messages';
import { zSetZipper } from '../util';

function notificationIdentifier(level: number): string {
	return `\`${level === 3 ? 'SEVERE' : level === 2 ? 'HIGH' : 'LOW'} ${
		level === 3 ? '🔴' : level === 2 ? '🟡' : '🟢'
	}\``;
}

export async function notifyCommand(interaction: CommandInteraction) {
	const messageParts = [];

	const {
		options,
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

	const addOption = options.get('add');
	const removeOption = options.get('remove');

	if (addOption) {
		const entity = addOption.options!.get('entity')!;
		const level = addOption.options!.get('level')!.value as number;
		const levelId = notificationIdentifier(level);
		if (entity.member) {
			const member = entity.member as GuildMember;
			void redis.zadd(NOTIF_USERS(guildID), level, member.id);
			messageParts.push(NOTIFY_USER_ADD(levelId, member.id));
		} else if (entity.role) {
			const role = entity.role as Role;
			void redis.zadd(NOTIF_ROLES(guildID), level, role.id);
			messageParts.push(NOTIFY_ROLE_ADD(role.id, levelId));
		}
	} else if (removeOption) {
		const entity = removeOption.options!.get('entity')!;
		if (entity.member) {
			const member = entity.member as GuildMember;
			void redis.zrem(NOTIF_USERS(guildID), member.id);
			messageParts.push(NOTIFY_USER_REMOVE(member.id));
		} else if (entity.role) {
			const role = entity.role as Role;
			void redis.zrem(NOTIF_ROLES(guildID), role.id);
			messageParts.push(NOTIFY_ROLE_REMOVE(role.id));
		}
	} else {
		const notifUsers = await redis.zrange(NOTIF_USERS(guildID), 0, -1, 'WITHSCORES');
		const notifRoles = await redis.zrange(NOTIF_ROLES(guildID), 0, -1, 'WITHSCORES');

		if (notifUsers.length || notifRoles.length) {
			const userMap = zSetZipper(notifUsers);
			const roleMap = zSetZipper(notifRoles);

			for (const [id, level] of userMap) {
				const levelId = notificationIdentifier(level);
				messageParts.push(NOTIFY_USER_SHOW(id, levelId));
			}

			for (const [id, level] of roleMap) {
				const levelId = notificationIdentifier(level);
				messageParts.push(NOTIFY_ROLE_SHOW(id, levelId));
			}
		} else {
			messageParts.push(NOTIFY_NONE);
		}
	}

	void interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
	});
}
