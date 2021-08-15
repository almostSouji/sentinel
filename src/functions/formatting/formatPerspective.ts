import i18next from 'i18next';
import { LIST_BULLET, PREFIX_LOCKED, PREFIX_NSFW, PREFIX_NYT } from '../../constants';
import { formatFlagString } from '../../utils/formatting';
import { PerspectiveResult } from '../inspection/checkPerspective';
import { AttributeScoreMapEntry, nsfwAtrributes, nytAttributes } from '../perspective';
import { inlineCode } from '@discordjs/builders';

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
			return inlineCode(key);
	}
}

export function formatPerspectiveDetails(data: AttributeScoreMapEntry[], locale: string) {
	data = data.filter((entry) => entry.value > 0);
	let nsfw = 0;
	let nyt = 0;

	const attributes = data
		.sort((a, b) => b.value - a.value)
		.map((val) => {
			if (nytAttributes.includes(val.key)) nyt++;
			if (nsfwAtrributes.includes(val.key)) nsfw++;
			return `• ${val.value.toFixed(2)}% ${formatFlagString(val.key, true)}`;
		})
		.join('\n');

	const disclaimers = [];
	if (nyt)
		disclaimers.push(
			`${PREFIX_NYT} ${i18next.t('attributes.explain_nyt', {
				lng: locale,
			})}`,
		);
	if (nsfw)
		disclaimers.push(
			`${PREFIX_NSFW} ${i18next.t('attributes.explain_nsfw', {
				lng: locale,
			})}`,
		);
	disclaimers.push(
		`${PREFIX_LOCKED} ${i18next.t('attributes.explain_forced', {
			lng: locale,
		})}`,
	);

	return `${attributes}${disclaimers.length ? `\n\n${disclaimers.join('\n')}` : ''}`;
}

export function formatPerspectiveShort(data: PerspectiveResult, locale: string): string {
	const { high } = data;
	return high.length
		? high
				.sort((a, b) => b.score.value - a.score.value)
				.map((e) => `${LIST_BULLET} ${mapKeyToAdverb(e.key)}`)
				.join('\n')
		: i18next.t('checks.format_perspective_none', {
				lng: locale,
		  });
}
