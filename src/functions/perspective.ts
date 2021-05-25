import { google } from 'googleapis';
import { PerspectiveResponseData, PerspectiveResponse, PerspectiveAttribute } from '../types/perspective';

export async function analyzeText(text: string, attributes: PerspectiveAttribute[]): Promise<PerspectiveResponseData> {
	const client = await google.discoverAPI('https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1');

	const requestedAttributes = Object.fromEntries(attributes.map((a) => [a, {}]));

	const analyzeRequest = {
		comment: {
			text,
		},
		requestedAttributes,
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