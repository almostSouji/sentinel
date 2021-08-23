import { google } from 'googleapis';
import { PerspectiveResponseData, PerspectiveResponse, PerspectiveAttribute } from '../../types/perspective';
import { cleanContent } from '../../utils';

export const perspectiveAttributes = [
	'SEVERE_TOXICITY',
	'IDENTITY_ATTACK',
	'TOXICITY',
	'INSULT',
	'PROFANITY',
	'THREAT',
	'SEXUALLY_EXPLICIT',
	'FLIRTATION',
	'ATTACK_ON_AUTHOR',
	'ATTACK_ON_COMMENTER',
	'INCOHERENT',
	'INFLAMMATORY',
	'LIKELY_TO_REJECT',
	'OBSCENE',
	'SPAM',
	'UNSUBSTANTIAL',
];

export const nytAttributes = [
	'ATTACK_ON_AUTHOR',
	'ATTACK_ON_COMMENTER',
	'INCOHERENT',
	'INFLAMMATORY',
	'LIKELY_TO_REJECT',
	'OBSCENE',
	'SPAM',
	'UNSUBSTANTIAL',
];

export const forcedAttributes = ['SEVERE_TOXICITY', 'IDENTITY_ATTACK'];
export const nsfwAtrributes = ['OBSCENE', 'SEXUALLY_EXPLICIT', 'PROFANITY', 'FLIRTATION'];

export interface AttributeScoreMapEntry {
	value: number;
	key: string;
}

export async function analyzeText(
	text: string,
	attributes: PerspectiveAttribute[],
	communityId?: string,
): Promise<PerspectiveResponseData> {
	const client = await google.discoverAPI('https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1');
	const requestedAttributes = Object.fromEntries(attributes.map((a) => [a, {}]));
	const cleaned = cleanContent(text);

	const analyzeRequest = {
		comment: {
			text: cleaned.length ? cleaned : ' ',
		},
		requestedAttributes,
		communityId: communityId,
		languages: ['en'],
	};

	const comments = client.comments as any;

	return new Promise((resolve, reject) => {
		comments.analyze(
			{
				key: process.env.PERSPECTIVE_TOKEN,
				resource: analyzeRequest,
			},
			(err: Error | undefined, response: PerspectiveResponse) => {
				if (err) reject(err);
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (!response.data) {
					reject(response);
				}
				resolve(response.data);
			},
		);
	});
}

export async function feedback(text: string, attributes: PerspectiveAttribute[], communityId: string): Promise<any> {
	const client = await google.discoverAPI('https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1');
	const comments = client.comments as any;

	const o: any = {} as any;

	for (const attribute of attributes) {
		o[attribute] = {
			summaryScore: {
				value: 0,
			},
		};
	}

	const feedbackRequest = {
		comment: {
			text,
		},
		attributeScores: o,
		communityId: communityId,
		languages: ['en'],
	};

	return new Promise((resolve, reject) => {
		comments.suggestscore(
			{
				key: process.env.PERSPECTIVE_TOKEN,
				resource: feedbackRequest,
			},
			(err: Error | undefined, response: PerspectiveResponse) => {
				if (err) reject(err);
				resolve(response);
			},
		);
	});
}
