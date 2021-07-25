import { Guild } from 'discord.js';
import { checkCustomTriggers, CustomTriggerResult } from './checkCustomTriggers';
import { checkPerspective, PerspectiveResult } from './checkPerspective';

export interface CheckResult {
	customTrigger: CustomTriggerResult[];
	perspective: PerspectiveResult;
}

export async function checkContent(content: string, guild: Guild, nsfw = false): Promise<CheckResult> {
	const customTrigger = await checkCustomTriggers(content, guild);
	const perspective = await checkPerspective(content, guild, nsfw);

	return {
		customTrigger,
		perspective,
	};
}
