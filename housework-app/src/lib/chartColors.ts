// Categorical palette (fixed order — never cycled), validated for CVD
// separation. See dataviz skill: references/palette.md.
const CATEGORICAL: { light: string; dark: string }[] = [
  { light: '#2a78d6', dark: '#3987e5' }, // blue
  { light: '#008300', dark: '#008300' }, // green
  { light: '#e87ba4', dark: '#d55181' }, // magenta
  { light: '#eda100', dark: '#c98500' }, // yellow
  { light: '#1baf7a', dark: '#199e70' }, // aqua
  { light: '#eb6834', dark: '#d95926' }, // orange
]

export function categoricalColor(slot: number, isDark: boolean): string {
  const c = CATEGORICAL[slot % CATEGORICAL.length]
  return isDark ? c.dark : c.light
}

// Roles used across the dashboard: "self" always slot 1 (blue), "partner"
// always slot 2 (green) — fixed identity regardless of who's viewing.
export function memberColor(isSelf: boolean, isDark: boolean): string {
  return categoricalColor(isSelf ? 0 : 1, isDark)
}

export const CHART_INK = {
  primary: { light: '#0b0b0b', dark: '#ffffff' },
  secondary: { light: '#52514e', dark: '#c3c2b7' },
  muted: { light: '#898781', dark: '#898781' },
  grid: { light: '#e1e0d9', dark: '#2c2c2a' },
  baseline: { light: '#c3c2b7', dark: '#383835' },
}

export function ink(role: keyof typeof CHART_INK, isDark: boolean): string {
  return isDark ? CHART_INK[role].dark : CHART_INK[role].light
}
