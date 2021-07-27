import { PREFIX_NYT } from '../../constants';
import { EXPLAIN_NYT, FLAGS_NONE } from '../../messages/messages';
import { PerspectiveResult } from '../inspection/checkPerspective';
import { AttributeScoreMapEntry, nytAttributes } from '../perspective';

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

export function formatPerspectiveDetails(data: AttributeScoreMapEntry[]) {
	data = data.filter((entry) => entry.value > 0);

	const attributes = data
		.sort((a, b) => b.value - a.value)
		.map((val) => `• ${val.value}% \`${val.key}\` ${nytAttributes.includes(val.key) ? PREFIX_NYT : ''} `)
		.join('\n');
	return `${attributes}${data.some((e) => nytAttributes.includes(e.key)) ? `\n\n${EXPLAIN_NYT}` : ''}`;
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
