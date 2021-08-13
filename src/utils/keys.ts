//* HSET<string, int>
// amount of messages per channel by this user with this hash on this guild
export const GUILD_USER_MESSAGE_CHANNEL_COUNT = (guild: string, user: string, hash: string) =>
	`guild:${guild}:user:${user}:hash:${hash}`;

//* STRING
// message id of the log message for this user and this hash on this guild
export const GUILD_HASH_LOGMESSAGE = (guild: string, user: string, hash: string) =>
	`guild:${guild}:user:${user}:hash:${hash}:logmessage`;
