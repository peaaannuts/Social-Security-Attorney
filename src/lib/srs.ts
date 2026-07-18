import type { ReviewState } from './types'

// 簡易 SM-2。要件どおり「簡易SM-2程度で十分」。
// grade は 5段階(0-5)相当に落とし込む:
//   誤答            -> 0
//   自信なしで正解  -> 3
//   正解            -> 5

export const DAY_MS = 24 * 60 * 60 * 1000

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function gradeFrom(correct: boolean, lowConfidence: boolean): number {
  if (!correct) return 0
  return lowConfidence ? 3 : 5
}

export interface SrsInput {
  prev?: Pick<ReviewState, 'intervalDays' | 'repetitions' | 'easeFactor'>
  grade: number
  now: number
}

export interface SrsResult {
  intervalDays: number
  repetitions: number
  easeFactor: number
  nextReviewAt: number
}

// SM-2 に基づいて次回間隔・次回出題日を算出する。
export function computeNextReview({ prev, grade, now }: SrsInput): SrsResult {
  const prevEase = prev?.easeFactor ?? 2.5
  const prevReps = prev?.repetitions ?? 0

  // 難易度係数の更新（下限 1.3）
  let easeFactor =
    prevEase + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  if (easeFactor < 1.3) easeFactor = 1.3

  let repetitions: number
  let intervalDays: number

  if (grade < 3) {
    // 不正解（または実質失敗）: リセットして翌日以内に再出題
    repetitions = 0
    intervalDays = 0 // = 当日中に復習キューへ戻す
  } else {
    repetitions = prevReps + 1
    if (repetitions === 1) {
      intervalDays = 1
    } else if (repetitions === 2) {
      intervalDays = grade === 3 ? 3 : 4
    } else {
      const prevInterval = prev?.intervalDays ?? 1
      intervalDays = Math.round(Math.max(1, prevInterval) * easeFactor)
    }
  }

  // intervalDays=0 は「今日の復習」に残す（当日の少し後に再提示）
  const nextReviewAt =
    intervalDays === 0
      ? now + 10 * 60 * 1000 // 10分後（同一セッションで戻ってくる）
      : startOfDay(now) + intervalDays * DAY_MS

  return { intervalDays, repetitions, easeFactor, nextReviewAt }
}
