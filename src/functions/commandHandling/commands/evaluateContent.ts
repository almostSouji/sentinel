import { CommandInteraction, DMChannel, MessageEmbed, MessageEmbedAuthor, ThreadChannel, User } from 'discord.js';
import { ArgumentsOf } from '../../../types/ArgumentsOf';
import { formatPerspectiveDetails } from '../../formatting/formatPerspective';
import { checkContent } from '../../inspection/checkContent';
import { EvaluateContentCommand } from '../../../interactions/evaluateContent';
import { setSeverityColor, strictnessPick } from '../../inspection/checkMessage';
import i18next from 'i18next';
import { replyWithError } from '../../../utils/responses';
import { GuildSettings } from '../../../types/DataTypes';
import { truncateEmbed } from '../../../utils';

export async function handleTestCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof EvaluateContentCommand>,
	locale: string,
) {
	const {
		client: { sql, user: clientUser },
		guild,
		channel,
	} = interaction;

	if (!channel || channel.partial) {
		return;
	}

	if (!guild || channel instanceof DMChannel) {
		return replyWithError(interaction, i18next.t('common.errors.not_in_dm', { lng: locale }));
	}

	let [settings] = await sql<GuildSettings[]>`
		select * from guild_settings where guild = ${guild.id}
	`;
	if (!settings) {
		[settings] = await sql<[GuildSettings]>`
			insert into guild_settings ${sql({
				guild: guild.id,
			})} returning *
		`;
	}

	const message = interaction.options.getMessage('message');
	const query =
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		args.query ??
		(message?.content.length ? message.content : message?.embeds.length ? message.embeds[0].description : '');

	if (!query.length) {
		return replyWithError(interaction, i18next.t('command.evaluatecontent.empty_query', { lng: locale }));
	}

	await interaction.deferReply({
		ephemeral: true,
	});

	const { perspective } = await checkContent(
		query,
		settings,
		channel instanceof ThreadChannel ? false : channel.nsfw,
		channel.guildId,
	);
	const attributes = formatPerspectiveDetails(
		perspective.tags.map(({ key, score }) => ({
			key,
			value: Math.round(score.value * 10000) / 100,
		})),
		locale,
	);

	const highAmount = Math.ceil(
		strictnessPick(
			settings.strictness,
			attributes.length * 0.125,
			attributes.length * 0.1875,
			attributes.length * 0.25,
		),
	);
	const veryHighAmount = Math.ceil(
		strictnessPick(settings.strictness, attributes.length * 0.3, attributes.length * 0.4, attributes.length * 0.5),
	);
	const severeAmount = 1;

	const perspectiveSeverity =
		perspective.severe.length >= severeAmount
			? 4
			: perspective.high.length >= veryHighAmount
			? 3
			: perspective.high.length >= highAmount
			? 2
			: 1;

	const embed = new MessageEmbed()
		.setDescription(query)
		.addField(i18next.t('command.evaluatecontent.perspective_fieldname', { lng: locale }), attributes);

	if (message && message.author instanceof User) {
		const logEmbed = message.embeds[0];
		if (message.author.id === clientUser!.id && logEmbed.author) {
			const author = logEmbed.author as MessageEmbedAuthor;
			embed.setAuthor(author.name ?? 'no content', author.iconURL ?? '');
		} else {
			embed.setAuthor(`${message.author.tag} (${message.author.id})`, message.author.displayAvatarURL());
		}
	}

	setSeverityColor(embed, perspectiveSeverity);

	await interaction.editReply({
		embeds: [truncateEmbed(embed)],
	});
}
