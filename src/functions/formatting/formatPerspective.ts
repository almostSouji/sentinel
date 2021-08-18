import i18next from 'i18next';
import { LIST_BULLET, PREFIX_LOCKED, PREFIX_NSFW, PREFIX_NYT } from '../../constants';
import { formatFlagString } from '../../utils/formatting';
import { PerspectiveResult } from '../inspection/checkPerspective';
import { AttributeScoreMapEntry, nsfwAtrributes, nytAttributes } from '../perspective';
import { inlineCode } from '@discordjs/builders';

function mapKeyToVerbose(key: string, locale: string): string {
	switch (key) {
		case 'TOXICITY':
			return i18next.t('flags.verbose.toxicity', {
				lng: locale,
			});
		case 'SEVERE_TOXICITY':
			return i18next.t('flags.verbose.severe_toxicity', {
				lng: locale,
			});
		case 'IDENTITY_ATTACK':
			return i18next.t('flags.verbose.identity_attack', {
				lng: locale,
			});
		case 'INSULT':
			return i18next.t('flags.verbose.insult', {
				lng: locale,
			});
		case 'PROFANITY':
			return i18next.t('flags.verbose.profanity', {
				lng: locale,
			});
		case 'THREAT':
			return i18next.t('flags.verbose.threat', {
				lng: locale,
			});
		case 'SEXUALLY_EXPLICIT':
			return i18next.t('flags.verbose.sexually_explicit', {
				lng: locale,
			});
		case 'FLIRTATION':
			return i18next.t('flags.verbose.flirtation', {
				lng: locale,
			});
		case 'ATTACK_ON_AUTHOR':
		case 'ATTACK_ON_COMMENTER':
			return i18next.t('flags.verbose.attack_on', {
				lng: locale,
			});
		case 'INCOHERENT':
			return i18next.t('flags.verbose.incoherent', {
				lng: locale,
			});
		case 'INFLAMMATORY':
			return i18next.t('flags.verbose.inflammatory', {
				lng: locale,
			});
		case 'LIKELY_TO_REJECT':
			return i18next.t('flags.verbose.likely_to_reject', {
				lng: locale,
			});
		case 'OBSCENE':
			return i18next.t('flags.verbose.obscene', {
				lng: locale,
			});
		case 'SPAM':
			return i18next.t('flags.verbose.spam', {
				lng: locale,
			});
		case 'UNSUBSTANTIAL':
			return i18next.t('flags.verbose.unsubstantial', {
				lng: locale,
			});
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
				.map((e) => `${LIST_BULLET} ${mapKeyToVerbose(e.key, locale)}`)
				.join('\n')
		: i18next.t('checks.format_perspective_none', {
				lng: locale,
		  });
}
