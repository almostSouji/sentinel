export type ScoreType = 'PROBABILIY';
export type LanguageShort = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'ru';

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
