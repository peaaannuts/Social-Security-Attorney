import Dexie, { type Table } from 'dexie'
import type { Question, StudyLog, ReviewState } from './types'

// ローカル完結（IndexedDB）。認証・サーバーは不要という要件に沿う。
export class StudyDatabase extends Dexie {
  questions!: Table<Question, number>
  studyLogs!: Table<StudyLog, number>
  reviewStates!: Table<ReviewState, number>

  constructor() {
    super('sharoushi-study')
    this.version(1).stores({
      // インデックス: 科目・タグ（複数値）で絞り込めるようにする
      questions: '++id, subject, format, *tags, createdAt',
      studyLogs: '++id, questionId, subject, answeredAt, correct',
      reviewStates: 'questionId, subject, nextReviewAt',
    })
  }
}

export const db = new StudyDatabase()
