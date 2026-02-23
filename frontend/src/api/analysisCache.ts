// Analysis Cache Utility
// Stores analysis results in localStorage so the PDF export can collect all data

export type AnalysisType =
  | 'boq'
  | 'sow'
  | 'clarifications'
  | 'strategic'
  | 'requiredDocs'
  | 'pricingIntel'
  | 'competitiveIntel'
  | 'competitorMapping'
  | 'decision'
  | 'gateConditions';

interface CachedEntry<T = unknown> {
  data: T;
  timestamp: number;
}

function cacheKey(tenderId: string, type: AnalysisType): string {
  return `tenderix_cache_${tenderId}_${type}`;
}

/** Save analysis result to localStorage */
export function saveAnalysis<T>(tenderId: string, type: AnalysisType, data: T): void {
  try {
    const entry: CachedEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(cacheKey(tenderId, type), JSON.stringify(entry));
  } catch (e) {
    console.warn(`Failed to cache ${type} for tender ${tenderId}:`, e);
  }
}

/** Retrieve cached analysis result (or null) */
export function getAnalysis<T = unknown>(tenderId: string, type: AnalysisType): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(tenderId, type));
    if (!raw) return null;
    const entry: CachedEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch {
    return null;
  }
}

/** List which analysis types are available for a tender */
export function getAllAvailable(tenderId: string): AnalysisType[] {
  const types: AnalysisType[] = [
    'boq', 'sow', 'clarifications', 'strategic', 'requiredDocs',
    'pricingIntel', 'competitiveIntel', 'competitorMapping', 'decision',
    'gateConditions',
  ];
  return types.filter(t => localStorage.getItem(cacheKey(tenderId, t)) !== null);
}
