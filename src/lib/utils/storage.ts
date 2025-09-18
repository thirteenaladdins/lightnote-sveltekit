import type { Entry, EntryInsight, WeeklyRollup } from '$lib/types';

// Storage keys as specified
const STORAGE_KEYS = {
  ENTRIES: 'lightnote.entries.v1',
  INSIGHTS: 'ln.entry.insights.v1',
  WEEKLY_ROLLUPS: 'ln.weekly.rollups.v1'
} as const;

// Generic storage utilities
export class StorageManager<T> {
  constructor(private key: string) {}

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  }

  load(): T | null {
    const storage = this.getStorage();
    if (!storage) return null;
    
    try {
      const stored = storage.getItem(this.key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error(`Failed to load data from ${this.key}:`, error);
      return null;
    }
  }

  save(data: T): boolean {
    const storage = this.getStorage();
    if (!storage) return false;
    
    try {
      storage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Failed to save data to ${this.key}:`, error);
      return false;
    }
  }

  clear(): boolean {
    const storage = this.getStorage();
    if (!storage) return false;
    
    try {
      storage.removeItem(this.key);
      return true;
    } catch (error) {
      console.error(`Failed to clear data from ${this.key}:`, error);
      return false;
    }
  }
}

// Specialized storage managers
export const entriesStorage = new StorageManager<Entry[]>(STORAGE_KEYS.ENTRIES);
export const insightsStorage = new StorageManager<Record<string, EntryInsight>>(STORAGE_KEYS.INSIGHTS);
export const weeklyRollupsStorage = new StorageManager<Record<string, WeeklyRollup>>(STORAGE_KEYS.WEEKLY_ROLLUPS);

// Helper functions for common operations
export function loadEntries(): Entry[] {
  return entriesStorage.load() || [];
}

export function saveEntries(entries: Entry[]): boolean {
  return entriesStorage.save(entries);
}

export function loadInsights(): Record<string, EntryInsight> {
  return insightsStorage.load() || {};
}

export function saveInsights(insights: Record<string, EntryInsight>): boolean {
  return insightsStorage.save(insights);
}

export function getInsightForEntry(entryId: string): EntryInsight | null {
  const insights = loadInsights();
  return insights[entryId] || null;
}

export function saveInsightForEntry(entryId: string, insight: EntryInsight): boolean {
  const insights = loadInsights();
  insights[entryId] = insight;
  return saveInsights(insights);
}

export function deleteInsightForEntry(entryId: string): boolean {
  const insights = loadInsights();
  delete insights[entryId];
  return saveInsights(insights);
}

export function loadWeeklyRollups(): Record<string, WeeklyRollup> {
  return weeklyRollupsStorage.load() || {};
}

export function saveWeeklyRollups(rollups: Record<string, WeeklyRollup>): boolean {
  return weeklyRollupsStorage.save(rollups);
}

export function getWeeklyRollup(weekKey: string): WeeklyRollup | null {
  const rollups = loadWeeklyRollups();
  return rollups[weekKey] || null;
}

export function saveWeeklyRollup(weekKey: string, rollup: WeeklyRollup): boolean {
  const rollups = loadWeeklyRollups();
  rollups[weekKey] = rollup;
  return saveWeeklyRollups(rollups);
}

// Utility to generate week key from date
export function getWeekKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}


