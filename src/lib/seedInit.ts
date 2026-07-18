import { db } from './db'
import { seedQuestions } from '../data/seed'

const FLAG = 'sharoushi-seeded'

// 初回起動時のみサンプル問題を投入。以後は投入済みフラグでスキップ。
// （ユーザーが全削除しても勝手に復活しないよう localStorage フラグで管理）
export async function ensureSeed(): Promise<void> {
  if (localStorage.getItem(FLAG)) return
  const count = await db.questions.count()
  if (count === 0) {
    const now = Date.now()
    await db.questions.bulkAdd(
      seedQuestions.map((q) => ({ ...q, createdAt: now, updatedAt: now })),
    )
  }
  localStorage.setItem(FLAG, '1')
}
