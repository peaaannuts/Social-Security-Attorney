export interface Household {
  id: string
  members: string[]
  nicknames: Record<string, string>
  inviteCode: string
  targetRatio: Record<string, number>
  createdAt: number
  createdBy: string
}

export const CHORE_CATEGORIES = [
  '料理',
  '洗濯',
  '掃除',
  'ゴミ出し',
  '買い物',
  'その他',
] as const

export type ChoreCategory = (typeof CHORE_CATEGORIES)[number]

export interface Chore {
  id: string
  name: string
  minutes: number
  loadFactor: number
  category: ChoreCategory
  isFavorite: boolean
  order: number
  createdAt: number
}

export interface ChoreLog {
  id: string
  choreId: string
  choreName: string
  category: ChoreCategory
  userId: string
  doneAt: number
  minutes: number
  loadFactor: number
  score: number
}
