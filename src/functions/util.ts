export function truncate(text: string, len: number): string {
	if (text.length <= len) return text;
	const words = text.split(' ');
	const res: string[] = [];
	for (const word of words) {
		const full = res.join(' ');
		if (full.length + word.length + 1 <= len - 3) {
			res.push(word);
		}
	}

	const resText = res.join(' ');
	return resText.length === text.length ? resText : `${resText.trim()}...`;
}

export function zSetZipper(raw: string[], words = false): [string, number][] {
	const res: [string, number][] = [];
	for (let i = 0; i < raw.length; i += 2) {
		res.push([words ? `\\b${raw[i]}\\b` : raw[i], parseInt(raw[i + 1], 10)]);
	}
	return res;
}

export function mapZippedByScore(set: [string, number][]): Map<number, [string]> {
	const map: Map<number, [string]> = new Map();
	for (const [key, score] of set) {
		const existing = map.get(score);
		if (existing) existing.push(key);
		else map.set(score, [key]);
	}
	return map;
}
