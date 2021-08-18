import { CronJob } from 'cron';
import { Client } from 'discord.js';
import { readdir, readFile } from 'fs/promises';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import * as Redis from 'ioredis';
import { join } from 'path';
import postgres from 'postgres';
import { logger } from '../functions/logger';
import { incidentCheck } from '../tasks/incidentCheck';
import { updateScamList } from '../tasks/updateScamList';

declare module 'discord.js' {
	export interface Client {
		readonly redis: Redis.Redis;
		readonly sql: postgres.Sql<Record<string, any>>;
		readonly listDict: Map<string, string[]>;
	}
}

export default class extends Client {
	public readonly redis: Redis.Redis = new Redis.default(6379, 'redis');
	public readonly sql: postgres.Sql<Record<string, any>> = postgres({
		onnotice: logger.info.bind(logger),
		debug: true,
	});

	public readonly listDict = new Map<string, string[]>();

	public async initDB() {
		await this.sql.begin(async (sql) => {
			await sql`
				create table if not exists incidents(
					id			integer primary key,
					type		text not null,
					message		text,
					channel		text,
					guild		text not null,
					"user"		text not null,
					attributes	text[] not null default '{}'::text[],
					flags		text[] not null default '{}'::text[],
					severity	smallint,
					createdat	timestamp not null default now(),
					expiresat	timestamp not null default now() + interval '1 day',
					logchannel	text,
					logmessage	text,
					resolvedby	text
				);
			`;

			await sql`
				create table if not exists users(
					"user"		text,
					guild		text,
					messages	integer not null default 1,
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
					subjects	text[] not null default '{}'::text[],
					primary key(guild, entity)
				);
			`;
		});
	}

	public async init() {
		const lists = await readdir(join(__dirname, '../../lists'));
		for (const listdoc of lists) {
			const listname = listdoc.split('.txt')[0].trim();
			const list = await readFile(join(__dirname, '../../lists', listdoc));
			this.listDict.set(
				listname,
				list
					.toString()
					.split('\n')
					.filter((words) => words.length),
			);
		}
		void updateScamList(this as Client);
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

		const incidentCheckJob = new CronJob('* * * * *', () => {
			void incidentCheck(this);
		});
		const updateScamListJob = new CronJob('*/5 * * * *', () => {
			void updateScamList(this as Client);
		});
		incidentCheckJob.start();
		updateScamListJob.start();
	}
}
