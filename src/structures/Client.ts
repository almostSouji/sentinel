import { CronJob } from 'cron';
import { Client } from 'discord.js';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import * as Redis from 'ioredis';
import { join } from 'path';
import postgres from 'postgres';
import { logger } from '../utils/logger';
import { incidentCheck } from '../tasks/incidentCheck';
import { LAST_FEEDBACK, LAST_INCIDENT } from '../utils/keys';

declare module 'discord.js' {
	export interface Client {
		readonly redis: Redis.Redis;
		readonly sql: postgres.Sql<Record<string, any>>;
		incrIncident(): Promise<number>;
		incrFeedback(): Promise<number>;
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
					id				integer primary key,
					type			text not null,
					message			text,
					channel			text,
					guild			text not null,
					"user"			text not null,
					attributes		text[] not null default '{}'::text[],
					flags			text[] not null default '{}'::text[],
					severity		smallint,
					createdat		timestamp not null default now(),
					expiresat		timestamp not null default now() + interval '1 day',
					logchannel		text,
					logmessage		text,
					resolvedby		text,
					resolvedat		timestamp,
					resolvedbyuser	text
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

			await sql`
				create table if not exists perspectivefeedback(
					id					integer primary key,
					incident			integer not null,
					"user"				text not null,
					content 			text not null,
					guild				text,
					wrongattributes		text[] not null default '{}'::text[],
					approved			boolean,
					reviewedat			timestamp
				);
			`;
		});
		const [{ next_incident_id }] = await this.sql<[{ next_incident_id: number }]>`select next_incident_id();`;
		await this.redis.set(LAST_INCIDENT, next_incident_id - 1);
		const [{ next_feedback_id }] = await this.sql<[{ next_feedback_id: number }]>`select next_feedback_id();`;
		await this.redis.set(LAST_FEEDBACK, next_feedback_id - 1);
	}

	public async incrIncident(): Promise<number> {
		return this.redis.incr(LAST_INCIDENT);
	}

	public async incrFeedback(): Promise<number> {
		return this.redis.incr(LAST_FEEDBACK);
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

		const incidentCheckJob = new CronJob('* * * * *', () => {
			void incidentCheck(this);
		});
		incidentCheckJob.start();
	}
}
