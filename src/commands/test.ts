import { CommandInteraction, MessageEmbed, ThreadChannel, User } from 'discord.js';
import { ArgumentsOf } from '../types/ArgumentsOf';
import { formatCustom } from '../functions/formatting/formatCustom';
import { formatPerspectiveDetails } from '../functions/formatting/formatPerspective';
import { checkContent } from '../functions/inspection/checkContent';
import { EvaluateContentCommand } from '../interactions/evaluateContent';
import { NOT_IN_DM, TEST_NO_CONTENT } from '../messages/messages';
import { setSeverityColor, strictnessPick } from '../functions/checkMessage';
import { STRICTNESS } from '../keys';
import { truncateEmbed } from '../functions/util';

export async function handleTestCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof EvaluateContentCommand>,
) {
	const {
		channel,
		client: { redis },
		guild,
	} = interaction;
	if (channel?.type === 'DM' || !guild || !channel)
		return interaction.reply({
			content: NOT_IN_DM,
			ephemeral: true,
		});

	const message = interaction.options.getMessage('message');
	const query = args.query ?? message?.content;

	if (!query?.length) {
		return interaction.reply({
			content: TEST_NO_CONTENT,
			ephemeral: true,
		});
	}

	const { customTrigger, perspective } = await checkContent(
		query,
		guild,
		channel instanceof ThreadChannel ? false : channel.nsfw,
	);
	const custom = formatCustom(customTrigger);
	const attributes = formatPerspectiveDetails(
		perspective.tags.map(({ key, score }) => ({
			key,
			value: Math.round(score.value * 10000) / 100,
		})),
	);

	const strictness = parseInt((await redis.get(STRICTNESS(guild.id))) ?? '1', 10);
	const highAmount = Math.ceil(
		strictnessPick(strictness, attributes.length * 0.125, attributes.length * 0.1875, attributes.length * 0.25),
	);
	const severeAmount = 1;

	const perspectiveSeverity =
		perspective.severe.length >= severeAmount ? 3 : perspective.high.length >= highAmount ? 2 : 1;
	const customSeverity = Math.max(...customTrigger.map((e) => e.severity), -1);
	const severityLevel = Math.max(perspectiveSeverity, customSeverity);

	const embed = new MessageEmbed().setDescription(query).addField('Perspective', attributes);
	if (custom.length) {
		embed.addField('Custom Triggers', custom);
	}

	if (message && message.author instanceof User) {
		embed.setAuthor(`${message.author.tag} (${message.author.id})`, message.author.displayAvatarURL());
	}

	setSeverityColor(embed, severityLevel);

	return interaction.reply({
		embeds: [truncateEmbed(embed)],
		ephemeral: true,
	});
}
