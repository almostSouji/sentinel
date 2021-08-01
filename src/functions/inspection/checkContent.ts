import { GuildSettings } from '../../types/DataTypes';
import { checkPerspective, PerspectiveResult } from './checkPerspective';

export interface CheckResult {
	perspective: PerspectiveResult;
}

export async function checkContent(content: string, settings: GuildSettings, nsfw = false): Promise<CheckResult> {
	const perspective = await checkPerspective(content, settings, nsfw);

	return {
		perspective,
	};
}
