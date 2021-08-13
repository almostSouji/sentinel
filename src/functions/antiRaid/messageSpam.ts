import { ColorResolvable, Message, MessageEmbed, ThreadChannel, User } from 'discord.js';
import { COLOR_GREEN, COLOR_ORANGE, COLOR_RED, COLOR_YELLOW, LIST_BULLET, SPAM_EXPIRE_SECONDS } from '../../constants';
import { GuildSettings } from '../../types/DataTypes';
import { hashString, transformHashset, truncateEmbed } from '../../utils';
import { GUILD_HASH_LOGMESSAGE, GUILD_USER_MESSAGE_CHANNEL_COUNT } from '../../utils/keys';
import i18next from 'i18next';
import { channelMention, inlineCode } from '@discordjs/builders';

function spamColor(amount: number, threshold: number): ColorResolvable {
	switch (amount) {
		case threshold:
		case threshold + 1:
			return COLOR_GREEN;
		case threshold + 2:
		case threshold + 3:
			return COLOR_YELLOW;
		case threshold + 4:
			return COLOR_ORANGE;
		default:
			return COLOR_RED;
	}
}

function buildEmbed(
	locale: string,
	author: User,
	tripMessage: Message,
	channelSpam: Record<string, number>,
	threshold: number,
	hash: string,
	oldMessage?: Message,
): MessageEmbed {
	const parts = oldMessage?.embeds[0]?.description?.split('\n') ?? [];
	const newParts = [];
	let total = 0;

	for (const [key, value] of Object.entries(channelSpam)) {
		total += value;
		newParts.push(
			i18next.t('spam.messages_in', {
				lng: locale,
				count: value,
				formattedCount: inlineCode(String(value)),
				bullet: LIST_BULLET,
				channel: channelMention(key),
			}),
		);
	}

	parts.push(`${LIST_BULLET} in ${channelMention(tripMessage.channel.id)}`);
	return new MessageEmbed()
		.setColor(spamColor(total, threshold))
		.setAuthor(`${author.tag} (${author.id})`, author.displayAvatarURL())
		.setTitle(i18next.t('spam.spam_detected', { lng: locale }))
		.setDescription(newParts.join('\n'))
		.addFields({
			name: i18next.t('spam.hash_fieldname', { lng: locale }),
			value: inlineCode(hash),
		});
}

export async function messageSpam(message: Message) {
	const {
		client: { redis, sql },
		guild,
		author,
		content,
		channelId,
	} = message;
	if (!guild || !message.content.length) return;
	const [settings] = await sql<GuildSettings[]>`select * from guild_settings where guild = ${guild.id}`;
	const threshold = settings.spamthreshold;
	if (!settings || !threshold) return;

	const locale = settings.locale;
	const hash = hashString(content);

	const channelSpamKey = GUILD_USER_MESSAGE_CHANNEL_COUNT(guild.id, author.id, hash);
	await redis.hincrby(channelSpamKey, channelId, 1);
	await redis.expire(channelSpamKey, SPAM_EXPIRE_SECONDS);
	const channelSpam = transformHashset(await redis.hgetall(channelSpamKey), (s: string) => parseInt(s, 10));

	const total = Object.values(channelSpam).reduce((a, c) => c + a, 0);

	const logChannel = guild.channels.resolve(settings.logchannel ?? '');
	if (!logChannel || total < threshold || logChannel instanceof ThreadChannel || !logChannel.isText()) return;

	const logkey = GUILD_HASH_LOGMESSAGE(guild.id, author.id, hash);

	try {
		const logMessageId = await redis.get(logkey);
		if (!logMessageId) {
			await sql`
				insert into users ${sql({
					user: author.id,
					guild: guild.id,
					antispam: 1,
				})}
				on conflict ("user", guild) do update
				set antispam = users.antispam + 1
			`;

			throw new Error('no log found');
		}
		const logMessage = await logChannel.messages.fetch(logMessageId);

		await logMessage.edit({
			embeds: [truncateEmbed(buildEmbed(locale, author, message, channelSpam, threshold, hash, logMessage))],
		});
		await redis.expire(logkey, SPAM_EXPIRE_SECONDS);
		return;
	} catch (err) {
		void redis.del(logkey);
	}

	const logMessage = await logChannel.send({
		embeds: [truncateEmbed(buildEmbed(locale, author, message, channelSpam, threshold, hash))],
	});
	await redis.set(logkey, logMessage.id);
	await redis.expire(logkey, SPAM_EXPIRE_SECONDS);
}
