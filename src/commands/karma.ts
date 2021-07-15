import { MessageEmbed, CommandInteraction } from 'discord.js';
import { COLOR_PURPLE } from '../constants';
import { KarmaCommand } from '../interactions/karma';
import { GUILD_USER_MESSAGES, GUILD_USER_MESSAGES_TRIPPED, GUILD_USER_FLAGS } from '../keys';
import { KARMA_NO_DATA, NOT_IN_DM } from '../messages/messages';
import { ArgumentsOf } from '../types/ArgumentsOf';

function formatAttribute(key: string, value: string): string {
	return `• ${value}x \`${key}\``;
}

export async function handleKarmaCommand(interaction: CommandInteraction, args: ArgumentsOf<typeof KarmaCommand>) {
	const {
		client: { redis },
		guild,
	} = interaction;

	if (!guild) {
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});
	}

	const user = args.user.user;
	const messages = await redis.get(GUILD_USER_MESSAGES(guild.id, user.id));
	const messagesTripped = await redis.get(GUILD_USER_MESSAGES_TRIPPED(guild.id, user.id));
	const attributesTripped = await redis.hgetall(GUILD_USER_FLAGS(guild.id, user.id));

	if (!messages || !messagesTripped) {
		return interaction.reply({
			content: KARMA_NO_DATA(user.tag),
			ephemeral: true,
		});
	}

	const attributesFormatted = [];
	for (const [key, value] of Object.entries(attributesTripped).sort(
		(a, b) => parseInt(a[1], 10) - parseInt(b[1], 10),
	)) {
		attributesFormatted.push(formatAttribute(key, value));
	}

	void interaction.reply({
		embeds: [
			new MessageEmbed()
				.addField(
					'Karma',
					`${messagesTripped} of ${messages} messages seen in watched channels on this guild have tripped ${String(
						Object.entries(attributesTripped).reduce((a, [, v]) => a + parseInt(v, 10), 0),
					)} flags`,
				)
				.addField('Attribute Flags', `${attributesFormatted.join('\n')}`)
				.setAuthor(`${user.tag} (${user.id})`, user.displayAvatarURL())
				.setColor(COLOR_PURPLE),
		],
		ephemeral: true,
	});
}
