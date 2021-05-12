import { google } from 'googleapis';
import { PerspectiveResponseData, PerspectiveResponse } from './types/perspective';

export async function analyzeText(text: string): Promise<PerspectiveResponseData> {
	const client = await google.discoverAPI('https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1');
	const analyzeRequest = {
		comment: {
			text,
		},
		requestedAttributes: {
			TOXICITY: {},
			SEVERE_TOXICITY: {},
			THREAT: {},
			IDENTITY_ATTACK: {},
			SEXUALLY_EXPLICIT: {},
			INSULT: {},
			FLIRTATION: {},
		},
		doNotStore: true,
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
				resolve(response.data);
			},
		);
	});
}
