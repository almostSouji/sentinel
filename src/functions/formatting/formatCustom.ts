import { MATCH_PHRASE } from '../../messages/messages';
import { levelIdentifier } from '../commands/notify';
import { CustomTriggerResult } from '../inspection/checkCustomTriggers';

export function formatCustom(data: CustomTriggerResult[]): string {
	return data
		.map((trigger) =>
			MATCH_PHRASE(trigger.word ?? trigger.phrase ?? '', levelIdentifier(trigger.severity), Boolean(trigger.word)),
		)
		.join('\n');
}
