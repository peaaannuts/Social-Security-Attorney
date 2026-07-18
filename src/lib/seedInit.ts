import { db } from './db'
import { seedQuestions } from '../data/seed'
import { importQuestions, type ImportResult } from './store'

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

// 収録サンプル問題を後から取り込む（アプリ更新で問題が追加された場合など）。
// importQuestions が科目＋問題文で重複判定するため、既存分はスキップされ、
// 新規分だけが追加される。ユーザーが編集・削除した既存問題は上書きしない。
export async function importSeedPack(): Promise<ImportResult> {
  return importQuestions(
    seedQuestions.map((q) => ({
      subject: q.subject,
      format: q.format,
      questionText: q.questionText,
      answer: q.answer,
      choices: q.choices,
      explanation: q.explanation,
      source: q.source,
      tags: q.tags,
    })),
  )
}
