/**
 * Shared constants for lead pipeline stages.
 * Single source of truth — import from here instead of redefining per-page.
 */

// Ordered list of pipeline stage IDs
export const LEAD_STAGES = ['scraped', 'enriched', 'researched', 'contacted', 'booked'];

// Display labels for each stage
export const STAGE_LABELS = {
  scraped: 'Scraped',
  enriched: 'Enriched',
  researched: 'Researched',
  contacted: 'Contacted',
  booked: 'Booked',
};

// Primary badge color per stage (Tailwind bg class)
export const STAGE_COLORS = {
  scraped: 'bg-slate-500',
  enriched: 'bg-purple-500',
  researched: 'bg-amber-500',
  contacted: 'bg-blue-500',
  booked: 'bg-emerald-500',
};

// Light background colors for cards / rows
export const STAGE_LIGHT_BG = {
  scraped: 'bg-slate-50 dark:bg-slate-900/30',
  enriched: 'bg-purple-50 dark:bg-purple-900/30',
  researched: 'bg-amber-50 dark:bg-amber-900/30',
  contacted: 'bg-blue-50 dark:bg-blue-900/30',
  booked: 'bg-emerald-50 dark:bg-emerald-900/30',
};

// Badge variant colors for table rows
export const STAGE_BADGE_COLORS = {
  scraped: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  enriched: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  researched: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  contacted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  booked: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
};
