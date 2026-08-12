/**
 * Middle-elision truncation: keeps the head and tail halves of the budget
 * and replaces the middle with an elision marker noting how much was cut.
 */
export function truncateMiddle(s: string, maxChars: number): string {
	if (s.length <= maxChars) return s;
	const head = Math.ceil(maxChars / 2);
	const tail = Math.floor(maxChars / 2);
	const elided = s.length - head - tail;
	return `${s.slice(0, head)}\n… [elided ${elided} chars] …\n${s.slice(s.length - tail)}`;
}
