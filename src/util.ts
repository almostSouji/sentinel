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
