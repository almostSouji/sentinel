export type ScoreType = 'PROBABILIY';
export type LanguageShort = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'ru';
export type PerspectiveAttribute =
	| 'TOXICITY' // en, fr, de, pt, it, ru
	| 'SEVERE_TOXICITY' // en, fr, es, de, it, pt, ru
	| 'IDENTITY_ATTACK' // de, it, pt, ru, en
	| 'INSULT' // de, it, pt, ru, en
	| 'PROFANITY' // de, it, pt, ru, en
	| 'THREAT' // de, it, pt, ru, en
	| 'SEXUALLY_EXPLICIT' // EXPERIMENTAL en
	| 'FLIRTATION' // EXPERIMENTAL en
	| 'ATTACK_ON_AUTHOR' // NYT en
	| 'ATTACK_ON_COMMENTER' // NYT en
	| 'INCOHERENT' // NYT en
	| 'INFLAMMATORY' // NYT en
	| 'LIKELY_TO_REJECT' // NYT en
	| 'OBSCENE' // NYT en
	| 'SPAM' // NYT en
	| 'UNSUBSTANTIAL'; // NYT en

export interface Score {
	value: number;
	type: ScoreType;
}

export interface SpanScore {
	begin: number;
	end: number;
	score: Score;
}

export interface Scores {
	spanScores: SpanScore[];
	summaryScore: Score;
}

export interface AttributeScores {
	INSULT: Scores;
	PROFANITY: Scores;
	THREAT: Scores;
	SPAM: Scores;
	INCOHERENT: Scores;
	IDENTITY_ATTACK: Scores;
	TOXICITY: Scores;
	SEVERE_TOXICITY: Scores;
	FLIRTATION: Scores;
	SEXUALLY_EXPLICIT: Scores;
}

export interface PerspectiveResponseData {
	attributeScores: AttributeScores;
	languages: LanguageShort[];
	detectedLanguages: LanguageShort[];
}

export interface PerspectiveResponse {
	data: PerspectiveResponseData;
}
