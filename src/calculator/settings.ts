import type { RoundingMode } from "./formatting";

export type Settings = {
  coefficient: string;
  decimalPlaces: number;
  roundingMode: RoundingMode;
  maxHistoryItems: number;
};

const SETTINGS_KEY = "dentaku.settings";

export const DEFAULT_SETTINGS: Settings = {
  coefficient: "0.65",
  decimalPlaces: 0,
  roundingMode: "half-up",
  maxHistoryItems: 100
};

export function loadSettings(): Settings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as Settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function resetSettings(): Settings {
  saveSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
