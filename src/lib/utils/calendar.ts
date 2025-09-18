// Calendar and date utilities for analytics

export interface CalendarCell {
	day: number;
	count: number;
	isCurrentMonth: boolean;
}

/**
 * Get entry count for a specific day
 */
export function getEntryCountForDay(entries: any[], year: number, month: number, day: number): number {
	return entries.filter((entry) => {
		const entryDate = new Date(entry.created);
		return (
			entryDate.getFullYear() === year &&
			entryDate.getMonth() === month &&
			entryDate.getDate() === day
		);
	}).length;
}

/**
 * Generate a 6x7 calendar grid for a given month
 */
export function generateCalendarGrid(entries: any[], currentMonth: Date): CalendarCell[][] {
	const year = currentMonth.getFullYear();
	const monthNum = currentMonth.getMonth();
	const firstDay = new Date(year, monthNum, 1);
	const lastDay = new Date(year, monthNum + 1, 0);
	const daysInMonth = lastDay.getDate();
	const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

	// Create calendar grid (6 weeks × 7 days)
	const grid = Array(6)
		.fill(null)
		.map(() => Array(7).fill({ day: 0, count: 0, isCurrentMonth: false }));

	// Fill in the days
	let day = 1;
	for (let week = 0; week < 6; week++) {
		for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
			if (week === 0 && dayOfWeek < startDayOfWeek) {
				// Previous month days - empty
				grid[week][dayOfWeek] = { day: 0, count: 0, isCurrentMonth: false };
			} else if (day <= daysInMonth) {
				// Current month days
				const entryCount = getEntryCountForDay(entries, year, monthNum, day);
				grid[week][dayOfWeek] = { day, count: entryCount, isCurrentMonth: true };
				day++;
			} else {
				// Next month days - empty
				grid[week][dayOfWeek] = { day: 0, count: 0, isCurrentMonth: false };
			}
		}
	}

	return grid;
}

/**
 * Get contribution level class based on entry count
 */
export function getContributionClass(count: number): string {
	if (count === 0) return 'contribution-none';
	if (count === 1) return 'contribution-very-low';
	if (count <= 3) return 'contribution-low';
	if (count <= 6) return 'contribution-medium';
	if (count <= 10) return 'contribution-medium-high';
	return 'contribution-high';
}

/**
 * Filter entries for a specific month
 */
export function filterEntriesForMonth(entries: any[], year: number, month: number): any[] {
	return entries.filter((entry) => {
		const entryDate = new Date(entry.created);
		return entryDate.getFullYear() === year && entryDate.getMonth() === month;
	});
}

/**
 * Navigate to previous month
 */
export function getPreviousMonth(currentMonth: Date): Date {
	return new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
}

/**
 * Navigate to next month
 */
export function getNextMonth(currentMonth: Date): Date {
	return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
}
