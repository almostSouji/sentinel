import { Guild, MessageButton, MessageActionRow, Snowflake, MessageEmbed, Permissions } from 'discord.js';
import { OpCodes } from '..';
import { handleMemberAdd } from './logStateHandlers/handleMemberAdd';
import { deserializeTargets, truncateEmbed } from '../utils';
import { GuildSettings } from '../types/DataTypes';

type BanHandler = (
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	target: Snowflake,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	locale: string,
	changedUser?: Snowflake,
	isBanned?: boolean,
) => boolean | Promise<boolean>;

type DeleteHandler = (
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
	deletedMessages: Snowflake[],
	locale: string,
) => boolean | Promise<boolean>;

export async function updateLogState(
	guild: Guild,
	banHandlers: BanHandler[] = [],
	deleteHandlers: DeleteHandler[] = [],
	changedStructures: Snowflake[] = [],
	isBanned?: boolean,
): Promise<void> {
	const {
		client,
		client: { sql },
	} = guild;
	const settings = (await sql<GuildSettings[]>`select * from guild_settings where guild = ${guild.id}`)[0];
	if (!settings || !settings.logchannel) return;

	const locale = settings.locale;
	const logChannel = guild.channels.resolve(`${settings.logchannel}` as Snowflake);
	if (!logChannel || !logChannel.isText()) return;

	if (
		!logChannel
			.permissionsFor(client.user!)
			?.has([Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.READ_MESSAGE_HISTORY, Permissions.FLAGS.SEND_MESSAGES])
	)
		return;

	for (const message of logChannel.messages.cache.values()) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (message.author?.id !== client.user!.id) continue;
		if (!message.embeds.length) continue;
		const embed = message.embeds[0];
		const content = message.content;
		if (!message.components.length) continue;
		const row = message.components[0];
		const buttons = row.components;

		const banButton = buttons.find((c) => Buffer.from(c.customId ?? '', 'binary').readUInt16LE() === OpCodes.BAN);
		const deleteButton = buttons.find((c) => Buffer.from(c.customId ?? '', 'binary').readUInt16LE() === OpCodes.DELETE);
		const reviewButton = buttons.find((c) => Buffer.from(c.customId ?? '', 'binary').readUInt16LE() === OpCodes.REVIEW);

		let changed = false;
		if (banButton) {
			const banB = banButton as MessageButton;
			const banBuffer = Buffer.from(banButton.customId ?? '', 'binary');
			const { user: targetUserId, channel: targetChannelId, message: targetMessageId } = deserializeTargets(banBuffer);
			for (const handler of banHandlers) {
				const res = handler(
					guild,
					embed,
					banB,
					row,
					targetUserId,
					targetChannelId,
					targetMessageId,
					locale,
					changedStructures[0],
					isBanned,
				);
				const change = res instanceof Promise ? await res : res;
				changed = change || changed;
			}
		} else if (reviewButton) {
			const reviewB = reviewButton as MessageButton;
			const listBuffer = Buffer.from(reviewButton.customId ?? '', 'binary');
			const { user: targetUserId, channel: targetChannelId, message: targetMessageId } = deserializeTargets(listBuffer);
			const change = handleMemberAdd(
				guild,
				embed,
				reviewB,
				row,
				targetUserId,
				targetChannelId,
				targetMessageId,
				changedStructures[0],
			);
			changed = change || changed;
		}
		if (deleteButton) {
			const dButton = deleteButton as MessageButton;
			const deleteBuffer = Buffer.from(deleteButton.customId ?? '', 'binary');
			const { channel: targetChannelId, message: targetMessageId } = deserializeTargets(deleteBuffer);
			for (const handler of deleteHandlers) {
				const res = handler(guild, embed, dButton, row, targetChannelId, targetMessageId, changedStructures, locale);
				const change = res instanceof Promise ? await res : res;
				changed = change || changed;
			}
		}

		if (!changed) continue;
		truncateEmbed(embed);
		void message.edit({
			content: content.length ? content : null,
			embeds: [embed],
			components: row.components.length ? [new MessageActionRow().addComponents(row.components)] : [],
		});
	}
}
