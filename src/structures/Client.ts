import { ClientOptions, Client } from 'discord.js';
import * as Redis from 'ioredis';

declare module 'discord.js' {
	export interface Client {
		readonly redis: Redis.Redis;
	}
}

export default class extends Client {
	public readonly redis: Redis.Redis = new Redis.default(6379, 'redis');
	public constructor(clientOptions: ClientOptions) {
		super(clientOptions);
	}
}
