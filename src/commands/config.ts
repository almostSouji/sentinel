import { ConfigCommand } from '../interactions/config';

import { CommandInteraction, DMChannel, MessageEmbed, Permissions, Snowflake, TextChannel } from 'discord.js';
import { ArgumentsOf } from '../types/ArgumentsOf';
import { forcedAttributes, nsfwAtrributes, nytAttributes } from '../functions/perspective';
import {
	COLOR_DARK,
	EMOJI_ID_SHIELD_GREEN_SMALL,
	EMOJI_ID_SHIELD_RED_SMALL,
	EMOJI_ID_SHIELD_YELLOW_SMALL,
	LIST_BULLET,
	PREFIX_LOCKED,
	PREFIX_NSFW,
	PREFIX_NYT,
} from '../constants';
import i18next from 'i18next';
import { GuildSettings, Immunity, Strictness } from '../types/DataTypes';
import { emojiOrFallback, truncateEmbed } from '../utils';
import { formatChannelMention, formatEmoji } from '../utils/formatting';
import { replyWithError } from '../utils/responses';

export enum IMMUNITY_LEVEL {
	NONE,
	MANAGE_MESSAGES,
	BAN_MEMBERS,
	ADMINISTRATOR,
}

export async function handleConfigCommand(
	interaction: CommandInteraction,
	args: ArgumentsOf<typeof ConfigCommand>,
	locale: string,
) {
	const {
		client: { sql },
		client,
		guild,
		channel,
	} = interaction;

	if (!channel || channel.partial) {
		return;
	}
	const successEmoji = emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_GREEN_SMALL), LIST_BULLET);
	const failEmoji = emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_RED_SMALL), LIST_BULLET);
	const warnEmoji = emojiOrFallback(channel, formatEmoji(EMOJI_ID_SHIELD_YELLOW_SMALL), LIST_BULLET);

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

	const messageParts = [];

	switch (Object.keys(args)[0] as keyof ArgumentsOf<typeof ConfigCommand>) {
		case 'edit': {
			if (args.edit.logchannel) {
				const channel = args.edit.logchannel;
				if (channel instanceof TextChannel) {
					if (
						channel
							.permissionsFor(client.user!)
							?.has([
								Permissions.FLAGS.EMBED_LINKS,
								Permissions.FLAGS.VIEW_CHANNEL,
								Permissions.FLAGS.READ_MESSAGE_HISTORY,
							])
					) {
						if (channel.id === settings.logchannel) {
							messageParts.push(
								`${warnEmoji}${i18next.t('command.config.lochannel_already', {
									channel: `<#${channel.id}>`,
									lng: locale,
								})}`,
							);
						} else {
							settings.logchannel = channel.id;
							messageParts.push(
								`${successEmoji}${i18next.t('command.config.logchannel_set', {
									channel: `<#${channel.id}>`,
									lng: locale,
								})}`,
							);
						}
					} else {
						messageParts.push(
							`${failEmoji}${i18next.t('command.config.logchannel_no_permissions', {
								channel: `<#${channel.id}>`,
								lng: locale,
							})}`,
						);
					}
				} else {
					messageParts.push(
						`${failEmoji}${i18next.t('command.config.logchannel_not_text', {
							channel: `<#${channel.id}>`,
							lng: locale,
						})}`,
					);
				}
			}

			if (args.edit.strictness) {
				if (args.edit.strictness === settings.strictness) {
					messageParts.push(
						`${warnEmoji}${i18next.t('command.config.strictness_already', {
							level: `\`${Strictness[args.edit.strictness]!}\``,
							lng: locale,
						})}`,
					);
				} else {
					settings.strictness = args.edit.strictness;
					messageParts.push(
						`${successEmoji}${i18next.t('command.config.strictness_updated', {
							level: `\`${Strictness[args.edit.strictness]!}\``,
							lng: locale,
						})}`,
					);
				}
			}

			if (args.edit.prefetch) {
				if (args.edit.prefetch === settings.prefetch) {
					messageParts.push(
						`${warnEmoji}${i18next.t('command.config.prefetch_already', {
							number: `\`${args.edit.prefetch}\``,
							lng: locale,
						})}`,
					);
				} else {
					settings.prefetch = args.edit.prefetch;
					messageParts.push(
						`${successEmoji}${i18next.t('command.config.prefetch_updated', {
							number: `\`${args.edit.prefetch}\``,
							lng: locale,
						})}`,
					);
				}
			}

			if (args.edit.immunity) {
				if (Immunity[args.edit.immunity] === settings.immunity) {
					messageParts.push(
						`${warnEmoji}${i18next.t('command.config.immunity_unchanged', {
							level: `${Immunity[args.edit.immunity]!}`,
							lng: locale,
						})}`,
					);
				} else {
					settings.immunity = Immunity[args.edit.immunity];
					messageParts.push(
						`${successEmoji}${i18next.t('command.config.immunity_updated', {
							level: `${Immunity[args.edit.immunity]!}`,
							lng: locale,
						})}`,
					);
				}
			}

			if (!args.edit.immunity && !args.edit.logchannel && !args.edit.prefetch && !args.edit.strictness) {
				return interaction.reply({
					content: `${warnEmoji} ${i18next.t('command.config.no_changes')}`,
					ephemeral: true,
				});
			}

			await sql`
				update guild_settings set 
					logchannel = ${settings.logchannel ?? null},
					strictness = ${settings.strictness},
					prefetch = ${settings.prefetch},
					immunity = ${settings.immunity}
				where guild = ${settings.guild}
			`;

			return interaction.reply({
				content: messageParts.join('\n'),
				ephemeral: true,
			});
		}
		case 'show': {
			const embed = new MessageEmbed();
			const channel = guild.channels.resolve(settings.logchannel as Snowflake);
			const missing = channel
				?.permissionsFor(client.user!)
				?.missing([
					Permissions.FLAGS.EMBED_LINKS,
					Permissions.FLAGS.VIEW_CHANNEL,
					Permissions.FLAGS.READ_MESSAGE_HISTORY,
				]);
			embed.addField(
				i18next.t('command.config.show_logchannel_fieldname', {
					lng: locale,
				}),
				channel
					? missing?.length
						? `${failEmoji}${i18next.t('command.config.show_logchannel_missing_permissions', {
								permissions: missing.map((k) => `\`${k}\``).join(', '),
								channel: `<#${channel.id}>`,
								lng: locale,
						  })}`
						: `<#${channel.id}>`
					: `${failEmoji} ${i18next.t('command.config.show_logchannel_missing', {
							lng: locale,
					  })}`,
			);

			embed.addField(
				i18next.t('command.config.show_watching_fieldname', {
					count: settings.watching.length,
					lng: locale,
				}),
				settings.watching.length
					? settings.watching.map((c) => formatChannelMention(c)).join(', ')
					: `${failEmoji}${i18next.t('command.config.show_watching_none', {
							lng: locale,
					  })}`,
			);

			const strictnessNumber = settings.strictness;
			embed.addField(
				i18next.t('command.config.show_strictness_fieldname', {
					lng: locale,
				}),
				Strictness[strictnessNumber],
				true,
			);

			embed.addField(
				i18next.t('command.config.show_immunity_fieldname', {
					lng: locale,
				}),
				settings.immunity,
				true,
			);

			embed.addField(
				i18next.t('command.config.show_prefetch_fieldname', {
					lng: locale,
				}),
				String(settings.prefetch),
				true,
			);

			const attributes = [...forcedAttributes, ...settings.attributes];
			if (attributes.length) {
				const disclaimers = [];
				const activeRegular = [];
				const activeNyt = [];
				let nsfw = 0;

				for (const flag of attributes) {
					if (nytAttributes.includes(flag)) {
						if (nsfwAtrributes.includes(flag)) {
							activeNyt.push(`• \`${flag}\` ${PREFIX_NYT} ${PREFIX_NSFW}`);
							nsfw++;
						} else if (forcedAttributes.includes(flag)) activeNyt.push(`• \`${flag}\` ${PREFIX_NYT} ${PREFIX_LOCKED}`);
						else activeNyt.push(`• \`${flag}\` ${PREFIX_NYT}`);
					} else if (nsfwAtrributes.includes(flag)) {
						activeRegular.push(`• \`${flag}\` ${PREFIX_NSFW}`);
						nsfw++;
					} else if (forcedAttributes.includes(flag)) activeRegular.push(`• \`${flag}\` ${PREFIX_LOCKED}`);
					else activeRegular.push(`• \`${flag}\``);
				}

				if (activeRegular.length) {
					embed.addField(
						i18next.t('command.config.show_attributes_fieldname', {
							count: activeRegular.length,
							lng: locale,
						}),
						activeRegular.join('\n'),
						true,
					);
				}

				if (activeNyt.length) {
					embed.addField(
						i18next.t('command.config.show_attributes_nyt_fieldname', {
							count: activeNyt.length,
							lng: locale,
						}),
						activeNyt.join('\n'),
						true,
					);
					disclaimers.push(
						`${PREFIX_NYT} ${i18next.t('attributes.explain_nyt', {
							lng: locale,
						})}`,
					);
				}

				if (nsfw) {
					disclaimers.push(
						`${PREFIX_NSFW} ${i18next.t('attributes.explain_nsfw', {
							lng: locale,
						})}`,
					);
				}

				disclaimers.push(
					`${PREFIX_LOCKED} ${i18next.t('attributes.explain_forced', {
						lng: locale,
					})}`,
				);

				if (disclaimers.length) {
					embed.addField('\u200B', disclaimers.join('\n'));
				}
			} else {
				embed.addField(
					i18next.t('command.config.show_attributes_fieldname', {
						lng: locale,
					}),
					`${failEmoji} ${i18next.t('command.config.show_attributes_none', {
						lng: locale,
					})}`,
					true,
				);
			}

			embed.setColor(COLOR_DARK);

			return interaction.reply({
				embeds: [truncateEmbed(embed)],
				ephemeral: true,
			});
		}
	}
}
