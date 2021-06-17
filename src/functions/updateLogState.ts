import { Guild, MessageButton, MessageActionRow, Snowflake, MessageEmbed } from 'discord.js';
import { OpCodes } from '..';
import { CHANNELS_LOG } from '../keys';
import { handleMemberAdd } from './logStateHandlers/handleMemberAdd';
import { deserializeTargets, truncateEmbed } from './util';

type BanHandler = (
	guild: Guild,
	embed: MessageEmbed,
	button: MessageButton,
	row: MessageActionRow,
	target: Snowflake,
	targetChannel: Snowflake,
	targetMessage: Snowflake,
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
) => boolean | Promise<boolean>;

export async function updateLogState(
	guild: Guild,
	banHandlers: BanHandler[] = [],
	deleteHandlers: DeleteHandler[] = [],
	changedStructures: Snowflake[] = [],
	isBanned?: boolean,
): Promise<void> {
	const { client } = guild;
	const logChannel = guild.channels.resolve((await client.redis.get(CHANNELS_LOG(guild.id))) ?? '');
	if (!logChannel || !logChannel.isText()) return;

	for (const message of logChannel.messages.cache.values()) {
		if (message.author.id !== client.user!.id) continue;
		if (!message.embeds.length) continue;
		const embed = message.embeds[0];
		const content = message.content;
		if (!message.components.length) continue;
		const row = message.components[0];
		const buttons = row.components;

		const banButton = buttons.find((c) => Buffer.from(c.customID ?? '', 'binary').readUInt16LE() === OpCodes.BAN);
		const deleteButton = buttons.find((c) => Buffer.from(c.customID ?? '', 'binary').readUInt16LE() === OpCodes.DELETE);
		const reviewButton = buttons.find((c) => Buffer.from(c.customID ?? '', 'binary').readUInt16LE() === OpCodes.REVIEW);

		let changed = false;
		if (banButton) {
			const banBuffer = Buffer.from(banButton.customID ?? '', 'binary');
			const { user: targetUserId, channel: targetChannelId, message: targetMessageId } = deserializeTargets(banBuffer);
			for (const handler of banHandlers) {
				const res = handler(
					guild,
					embed,
					banButton,
					row,
					targetUserId,
					targetChannelId,
					targetMessageId,
					changedStructures[0],
					isBanned,
				);
				const change = res instanceof Promise ? await res : res;
				changed = change || changed;
			}
		} else if (reviewButton) {
			const listBuffer = Buffer.from(reviewButton.customID ?? '', 'binary');
			const { user: targetUserId, channel: targetChannelId, message: targetMessageId } = deserializeTargets(listBuffer);
			const change = handleMemberAdd(
				guild,
				embed,
				reviewButton,
				row,
				targetUserId,
				targetChannelId,
				targetMessageId,
				changedStructures[0],
			);
			changed = change || changed;
		}
		if (deleteButton) {
			const deleteBuffer = Buffer.from(deleteButton.customID ?? '', 'binary');
			const { channel: targetChannelID, message: targetMessageId } = deserializeTargets(deleteBuffer);
			for (const handler of deleteHandlers) {
				const res = handler(guild, embed, deleteButton, row, targetChannelID, targetMessageId, changedStructures);
				const change = res instanceof Promise ? await res : res;
				changed = change || changed;
			}
		}

		if (!changed) continue;
		truncateEmbed(embed);
		void message.edit(content.length ? content : null, {
			embed,
			components: row.components.length ? [new MessageActionRow().addComponents(row.components)] : [],
		});
	}
}
