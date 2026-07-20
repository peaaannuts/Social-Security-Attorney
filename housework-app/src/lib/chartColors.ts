// Categorical palette (fixed order — never cycled), validated for CVD
// separation. See dataviz skill: references/palette.md.
const CATEGORICAL: { light: string; dark: string }[] = [
  { light: '#2a78d6', dark: '#3987e5' }, // 0: blue
  { light: '#008300', dark: '#008300' }, // 1: green
  { light: '#e87ba4', dark: '#d55181' }, // 2: magenta
  { light: '#eda100', dark: '#c98500' }, // 3: yellow
  { light: '#1baf7a', dark: '#199e70' }, // 4: aqua
  { light: '#eb6834', dark: '#d95926' }, // 5: orange
  { light: '#4a3aa7', dark: '#9085e9' }, // 6: violet
  { light: '#e34948', dark: '#e66767' }, // 7: red
]

export function categoricalColor(slot: number, isDark: boolean): string {
  const c = CATEGORICAL[slot % CATEGORICAL.length]
  return isDark ? c.dark : c.light
}

// Roles used across the dashboard: "self" always slot 0 (blue), "partner"
// always slot 1 (green) — fixed identity regardless of who's viewing.
export function memberColor(isSelf: boolean, isDark: boolean): string {
  return categoricalColor(isSelf ? 0 : 1, isDark)
}

// Chore categories deliberately start at slot 2 (magenta) and never touch
// slots 0-1 (blue/green): those are reserved for self/partner identity
// elsewhere on the same dashboard, and reusing them for category would let
// "料理" and "自分" both render blue right next to each other.
export function categoryColor(index: number, isDark: boolean): string {
  return categoricalColor(2 + index, isDark)
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
