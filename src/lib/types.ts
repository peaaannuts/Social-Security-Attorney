// 社労士試験の科目（足切り＝科目別基準点があるため科目管理は必須）
export const SUBJECTS = [
  '労基・安衛',
  '労災',
  '雇用',
  '徴収',
  '労一',
  '社一',
  '健保',
  '国年',
  '厚年',
] as const

export type Subject = (typeof SUBJECTS)[number]

// 出題形式。○×（択一の肢を分解した一問一答）と 選択式（空欄補充クローズ）。
export type QuestionFormat = 'ox' | 'select'

// 選択式の空欄プレースホルダ。問題文にこのトークン（または2文字以上の
// アンダースコア）を置くと、演習画面で空欄として描画される。
export const BLANK_TOKEN = '＿＿＿'
export const BLANK_RE = /[_＿]{2,}/

export interface Question {
  id?: number
  subject: Subject
  format: QuestionFormat
  // 問題文（○×なら肢の文、選択式なら空欄を含む条文など）
  questionText: string
  // ○×形式: '○' | '×' 。選択式: 正答の語句
  answer: string
  // 選択式の選択肢（正答を含む）。○×では未使用。
  choices?: string[]
  explanation: string
  // 出典（例: 2023年 択一 労基 問3）
  source?: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface StudyLog {
  id?: number
  questionId: number
  subject: Subject
  answeredAt: number
  correct: boolean
  // 「自信なし」フラグ（正解でも短い間隔で再出題する）
  lowConfidence: boolean
  responseTimeMs: number
}

export interface ReviewState {
  // questionId を主キーにする（1問1状態）
  questionId: number
  subject: Subject
  nextReviewAt: number // 次回出題日（epoch ms）
  intervalDays: number // 現在の間隔（日）
  repetitions: number // 連続正解数
  easeFactor: number // 難易度係数（SM-2、初期 2.5）
  lastReviewedAt: number
}

// インポート用の1行分（CSV/JSON共通の緩い形）
export interface QuestionImportRow {
  subject: string
  format?: string
  questionText: string
  answer: string
  choices?: string | string[]
  explanation?: string
  source?: string
  tags?: string | string[]
}
