import { MessageEmbed } from 'discord.js';

export function truncate(text: string, len: number): string {
	if (text.length <= len) return text;
	const words = text.split(' ');
	const res: string[] = [];
	for (const word of words) {
		const full = res.join(' ');
		if (full.length + word.length + 1 <= len - 3) {
			res.push(word);
		}
	}

	const resText = res.join(' ');
	return resText.length === text.length ? resText : `${resText.trim()}...`;
}

export function zSetZipper(raw: string[], words = false): [string, number][] {
	const res: [string, number][] = [];
	for (let i = 0; i < raw.length; i += 2) {
		res.push([words ? `\\b${raw[i]}\\b` : raw[i], parseInt(raw[i + 1], 10)]);
	}
	return res;
}

export function mapZippedByScore(set: [string, number][]): Map<number, [string]> {
	const map: Map<number, [string]> = new Map();
	for (const [key, score] of set) {
		const existing = map.get(score);
		if (existing) existing.push(key);
		else map.set(score, [key]);
	}
	return map;
}

const LIMIT_EMBED_DESCRIPTION = 2048 as const;
const LIMIT_EMBED_TITLE = 256 as const;
const LIMIT_EMBED_FIELDS = 25 as const;
const LIMIT_EMBED_FIELD_NAME = 256 as const;
const LIMIT_EMBED_FIELD_VALUE = 1024 as const;
const LIMIT_EMBED_AUTHOR_NAME = 256 as const;
const LIMIT_EMBED_FOOTER_TEXT = 2048 as const;

export function truncateEmbed(embed: MessageEmbed): MessageEmbed {
	if (embed.description && embed.description.length > LIMIT_EMBED_DESCRIPTION) {
		embed.description = truncate(embed.description, LIMIT_EMBED_DESCRIPTION);
	}
	if (embed.title && embed.title.length > LIMIT_EMBED_TITLE) {
		embed.title = truncate(embed.title, LIMIT_EMBED_TITLE);
	}
	if (embed.fields.length > LIMIT_EMBED_FIELDS) {
		embed.fields = embed.fields.slice(0, LIMIT_EMBED_FIELDS);
	}
	if (embed.author?.name) {
		embed.author.name = truncate(embed.author.name, LIMIT_EMBED_AUTHOR_NAME);
	}
	if (embed.footer?.text) {
		embed.footer.text = truncate(embed.footer.text, LIMIT_EMBED_FOOTER_TEXT);
	}
	for (const field of embed.fields) {
		field.name = truncate(field.name, LIMIT_EMBED_FIELD_NAME);
		field.value = truncate(field.value, LIMIT_EMBED_FIELD_VALUE);
	}
	return embed;
}
