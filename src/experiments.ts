import { Client, MessageEmbed, MessageMentionOptions } from 'discord.js';
import { sign, verify } from 'crypto';
import { readFileSync } from 'fs';
import { logger } from './logger';

export interface ResponseData {
	data: {
		content: string | null;
		embed: any;
		components: Component[];
		allowed_mentions: any;
	};
}

export interface Component {
	type: number;
	components?: Component[];
	style?: number;
	custom_id?: string;
	label?: string;
	emoji?: {
		id: string;
	};
}

export function buttons(
	client: Client,
	channel: string,
	embed: MessageEmbed,
	targetUser: string,
	targetMessage: string,
	content: string | null,
	allowed_mentions: MessageMentionOptions,
): void {
	// eslint-disable-next-line @typescript-eslint/dot-notation
	const api = client['api'] as any;
	const response: ResponseData = {
		data: {
			content,
			embed,
			components: [
				{
					type: 1,
					components: [],
				},
			],
			allowed_mentions,
		},
	};

	try {
		response.data.components[0].components?.push({
			type: 2,
			style: 4,
			custom_id: signPayload(`ban-${targetUser}-${channel}/${targetMessage}`),
			label: 'Ban & Delete',
			emoji: {
				id: '842911192489787412',
			},
		});

		response.data.components[0].components?.push({
			type: 2,
			style: 4,
			custom_id: signPayload(`delete-${targetUser}-${channel}/${targetMessage}`),
			label: 'Delete',
			emoji: {
				id: '842716273900257352',
			},
		});

		response.data.components[0].components?.push({
			type: 2,
			style: 3,
			custom_id: signPayload('approve'),
			label: 'Approve',
			emoji: {
				id: '842912618095706192',
			},
		});

		response.data.components[0].components?.push({
			type: 2,
			style: 2,
			custom_id: signPayload('dismiss'),
			label: 'Dismiss',
		});

		api.channels(channel).messages.post(response);
	} catch (err) {
		logger.error(err);
	}
}

export function signPayload(payload: string): string {
	const key = readFileSync('./privkey.pem');
	const payloadBuffer = Buffer.from(payload);
	const signature = sign('sha256', payloadBuffer, {
		key,
	});
	return `${payloadBuffer.toString('base64')}.${signature.toString('base64')}`;
}

export function verifyPayload(signedPayload: string): string | null {
	const key = readFileSync('./pubkey.pem');
	const [payloadB46, signB46] = signedPayload.split('.');
	const payloadBuffer = Buffer.from(payloadB46, 'base64');
	const check = verify(
		'sha256',
		payloadBuffer,
		{
			key,
		},
		Buffer.from(signB46, 'base64'),
	);
	return check ? payloadBuffer.toString('utf8') : null;
}
