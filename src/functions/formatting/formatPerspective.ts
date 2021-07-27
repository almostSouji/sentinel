import { PREFIX_NSFW, PREFIX_NYT, PREFIX_LOCKED } from '../../constants';
import { EXPLAIN_FORCED, EXPLAIN_NSFW, EXPLAIN_NYT, FLAGS_NONE } from '../../messages/messages';
import { PerspectiveResult } from '../inspection/checkPerspective';
import { AttributeScoreMapEntry, forcedAttributes, nsfwAtrributes, nytAttributes } from '../perspective';

function mapKeyToAdverb(key: string): string {
	switch (key) {
		case 'TOXICITY':
			return 'toxic';
		case 'SEVERE_TOXICITY':
			return 'severely toxic';
		case 'IDENTITY_ATTACK':
			return "attacking someone's identity";
		case 'INSULT':
			return 'insulting';
		case 'PROFANITY':
			return 'profane';
		case 'THREAT':
			return 'threatening';
		case 'SEXUALLY_EXPLICIT':
			return 'sexually explicit';
		case 'FLIRTATION':
			return 'flirtatious';
		case 'ATTACK_ON_AUTHOR':
		case 'ATTACK_ON_COMMENTER':
			return 'attacking someone';
		case 'INCOHERENT':
			return 'incoherent';
		case 'INFLAMMATORY':
			return 'inflammatory';
		case 'LIKELY_TO_REJECT':
			return 'rejected by New York Times moderators';
		case 'OBSCENE':
			return 'obscene';
		case 'SPAM':
			return 'spam';
		case 'UNSUBSTANTIAL':
			return 'unsubstantial';
		default:
			return `\`${key}\``;
	}
}

export function formatFlag(flag: string): string {
	const icons = [];
	if (nytAttributes.includes(flag)) icons.push(PREFIX_NYT);
	if (nsfwAtrributes.includes(flag)) icons.push(PREFIX_NSFW);
	if (forcedAttributes.includes(flag)) icons.push(PREFIX_LOCKED);
	return `\`${flag}\` ${icons.join(' ')}`.trim();
}

export function formatPerspectiveDetails(data: AttributeScoreMapEntry[]) {
	data = data.filter((entry) => entry.value > 0);
	let nsfw = 0;
	let nyt = 0;

	const attributes = data
		.sort((a, b) => b.value - a.value)
		.map((val) => {
			if (nytAttributes.includes(val.key)) nyt++;
			if (nsfwAtrributes.includes(val.key)) nsfw++;
			return `• ${val.value}% ${formatFlag(val.key)}`;
		})
		.join('\n');

	const disclaimers = [];
	if (nyt) disclaimers.push(EXPLAIN_NYT);
	if (nsfw) disclaimers.push(EXPLAIN_NSFW);
	disclaimers.push(EXPLAIN_FORCED);

	return `${attributes}${disclaimers.length ? `\n\n${disclaimers.join('\n')}` : ''}`;
}

export function formatPerspectiveShort(data: PerspectiveResult): string {
	const { high } = data;
	return high.length
		? high
				.sort((a, b) => b.score.value - a.score.value)
				.map((e) => `• ${mapKeyToAdverb(e.key)}`)
				.join('\n')
		: FLAGS_NONE;
}
