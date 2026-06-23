export type HistoryItem = {
  id: string;
  kind: "limit-price" | "calculator";
  expression: string;
  result: string;
  createdAt: string;
};

const HISTORY_KEY = "dentaku.history";

export function loadHistory(): HistoryItem[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(history: HistoryItem[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function createHistoryItem(kind: HistoryItem["kind"], expression: string, result: string): HistoryItem {
  return {
    id: crypto.randomUUID(),
    kind,
    expression,
    result,
    createdAt: new Date().toISOString()
  };
}
