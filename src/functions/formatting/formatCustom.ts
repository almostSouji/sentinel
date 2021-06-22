import { MATCH_PHRASE } from '../../messages/messages';
import { CustomTriggerResult } from '../inspection/checkCustomTriggers';

export function formatCustom(data: CustomTriggerResult[]): string {
	return data
		.map((trigger) => MATCH_PHRASE(trigger.word ?? trigger.phrase ?? '', trigger.severity, Boolean(trigger.word)))
		.join('\n');
}
