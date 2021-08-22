import { CommandInteraction, DMChannel, Role } from 'discord.js';
import { NotifyCommand } from '../../../interactions/notify';
import { ArgumentsOf } from '../../../types/ArgumentsOf';
import i18next from 'i18next';
import { replyWithError } from '../../../utils/responses';
import { EMOJI_ID_SHIELD_GREEN_SMALL, LIST_BULLET } from '../../../utils/constants';
import { emojiOrFallback } from '../../../utils';
import { formatSeverity } from '../../../utils/formatting';
import { Notification, NotificationTargets, NotificationTopics } from '../../../types/DataTypes';
import { formatEmoji, userMention, roleMention } from '@discordjs/builders';

export async function handleNotifyCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof NotifyCommand>,
	locale: string,
) {
	const {
		client: { sql },
		guild,
		channel,
	} = interaction;

	if (!channel || channel.partial) {
		return;
	}

	if (!guild || channel instanceof DMChannel) {
		return replyWithError(interaction, i18next.t('common.errors.not_in_dm', { lng: locale }));
	}

	const successEmoji = emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_GREEN_SMALL), LIST_BULLET);
	const messageParts = [];

	const action = Object.keys(args)[0] as keyof ArgumentsOf<typeof NotifyCommand>;
	switch (action) {
		case 'add':
			{
				const entity = args.add.entity;
				const level = args.add.level;
				const newData = {
					guild: guild.id,
					entity: entity instanceof Role ? entity.id : entity.user.id,
					type: entity instanceof Role ? NotificationTargets.ROLE : NotificationTargets.USER,
					subjects: sql.array(args.add.spamalert ? [NotificationTopics.SPAM] : []),
					level,
				};

				await sql`
					insert into notifications ${sql(newData)}
					on conflict (guild, entity)
					do update set ${sql(newData)}
				`;

				messageParts.push(
					args.add.spamalert
						? `${successEmoji}${i18next.t('command.notify.notification_change_antispam', {
								entity: entity instanceof Role ? roleMention(entity.id) : userMention(entity.user.id),
								level: formatSeverity(channel, level),
								lng: locale,
						  })}`
						: `${successEmoji}${i18next.t('command.notify.notification_change', {
								entity: entity instanceof Role ? roleMention(entity.id) : userMention(entity.user.id),
								level: formatSeverity(channel, level),
								lng: locale,
						  })}`,
				);
			}
			break;

		case 'remove':
			{
				const entity = args.remove.entity;
				await sql`
					delete from notifications where guild = ${guild.id} and entity = ${
					entity instanceof Role ? entity.id : entity.user.id
				}`;

				messageParts.push(
					`${successEmoji}${i18next.t('command.notify.notification_remove', {
						entity: entity instanceof Role ? roleMention(entity.id) : userMention(entity.user.id),
						lng: locale,
					})}`,
				);
			}
			break;
		case 'show':
			{
				const notifications = await sql<Notification[]>`
					select * from notifications where guild = ${guild.id}
				`;

				if (!notifications.length) {
					return replyWithError(interaction, i18next.t('command.notify.notification_none', { lng: locale }));
				}

				for (const notification of notifications) {
					messageParts.push(
						notification.subjects.includes('SPAM')
							? `${LIST_BULLET} ${i18next.t('command.notify.notification_show_antispam', {
									entity:
										notification.type === 'ROLE' ? roleMention(notification.entity) : userMention(notification.entity),
									level: formatSeverity(channel, notification.level),
									lng: locale,
							  })}`
							: `${LIST_BULLET} ${i18next.t('command.notify.notification_show', {
									entity:
										notification.type === 'ROLE' ? roleMention(notification.entity) : userMention(notification.entity),
									level: formatSeverity(channel, notification.level),
									lng: locale,
							  })}`,
					);
				}
			}
			break;
	}

	return interaction.reply({
		content: messageParts.join('\n'),
		ephemeral: true,
		allowedMentions: { parse: [] },
	});
}
