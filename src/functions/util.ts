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

export function zsetZipper(raw: string[]): [string, string][] {
	const res: [string, string][] = [];
	for (let i = 0; i < raw.length; i += 2) {
		res.push([raw[i], raw[i + 1]]);
	}
	return res;
}
