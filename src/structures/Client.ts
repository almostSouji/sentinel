import { Client } from 'discord.js';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import * as Redis from 'ioredis';
import { join } from 'path';
import postgres from 'postgres';
import { logger } from '../functions/logger';

declare module 'discord.js' {
	export interface Client {
		readonly redis: Redis.Redis;
		readonly sql: postgres.Sql<Record<string, any>>;
	}
}

export default class extends Client {
	public readonly redis: Redis.Redis = new Redis.default(6379, 'redis');
	public readonly sql: postgres.Sql<Record<string, any>> = postgres({
		onnotice: logger.info.bind(logger),
		debug: true,
	});

	public async initDB() {
		await this.sql.begin(async (sql) => {
			await sql`
				create table if not exists incidents(
					id			serial primary key,
					message		text not null,
					channel		text not null,
					guild		text not null,
					author		text not null,
					attributes	text[] not null,
					flags		text[] not null,
					severity	smallint not null,
					createdAt	timestamp not null default now()
				);
			`;

			await sql`
				create table if not exists users(
					"user"		text,
					guild		text,
					messages	integer not null default 1,
					antispam	integer not null default 0,
					primary key(guild, "user")
				);
			`;

			await sql`
				create table if not exists guild_settings(
					guild			text primary key,
					logchannel		text,
					strictness		smallint not null default 1,
					watching		text[] not null default '{}'::text[],
					attributes		text[] not null default '{}'::text[],
					prefetch		smallint not null default 0,
					immunity		text not null default 'NONE',
					flags			text[] not null default '{}'::text[],
					locale			text not null default 'en-US',
					spamthreshold	smallint
				);
			`;

			await sql`
				create table if not exists notifications(
					guild		text,
					entity		text,
					type		text not null,
					level		smallint not null,
					primary key(guild, entity)
				);
			`;
		});
	}

	public async init() {
		await i18next.use(Backend).init({
			backend: {
				loadPath: join(__dirname, '../../locales/{{lng}}/{{ns}}.json'),
			},
			cleanCode: true,
			fallbackLng: ['en-US'],
			defaultNS: 'translation',
			lng: 'en-US',
			ns: ['translation'],
		});
		await this.initDB();
	}
}
