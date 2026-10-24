const rioCalendar = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'America/Sao_Paulo',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

/** Calendar date used by the portfolio, independent of the server or visitor's timezone. */
export function rioDate(now = new Date()): string {
	const parts = rioCalendar.formatToParts(now);
	const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
	return `${part('year')}-${part('month')}-${part('day')}`;
}
