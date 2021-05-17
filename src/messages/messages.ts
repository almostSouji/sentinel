export const READY_LOG = (tag: string) => `${tag} is watching!`;
export const BAN_SUCCESS = (executor: string, target: string) => `• \`${executor}\` banned \`${target}\``;
export const BAN_FAIL = (executor: string, target: string) => `• \`${executor}\` could not ban \`${target}\``;
export const DELETE_SUCCESS = (executor: string) => `•\`${executor}\` deleted the message`;
export const DELETE_FAIL = (executor: string) => `•\`${executor}\` could not delete the message`;
export const DISMISSED = (executor: string) => `•\`${executor}\` reviewed this case`;
export const APPROVED = (executor: string) => `•\`${executor}\` approved this message`;
export const LOG_FOOTER_TEXT = (executor: string, id: string) => `Last action by ${executor} (${id})`;
