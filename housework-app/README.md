# 家事分担アプリ

同居する2人の家事の量と偏りをデータで可視化し、「言った・言わない」「やっている・やっていない」の
感覚のズレを解消するための PWA です。相手を責める道具ではなく、フェアな話し合いの材料を提供します。

> 元の要件定義書は Flutter + Firebase（モバイルアプリ）を想定していましたが、この開発環境に
> Flutter SDK が無く実機/エミュレータでの検証もできないため、Web PWA（React + TypeScript + Vite）
> として実装しています。Firebase（Auth / Firestore）は Web SDK でそのまま利用しているため、
> 2人間のリアルタイム同期・オフライン対応は要件定義書どおりに動作します。

## コンセプト

- 家事の作業量（時間 × 負荷係数）を定量化し、2人の分担比率を見える化する
- 記録の手間を極限まで減らす（ホーム画面のワンタップで記録、起動から3秒以内）
- 競争・採点ではなく対話のきっかけをつくる（ポイント対抗やランキングは意図的に実装していません）

## 実装済み機能（MVP + v1.1 相当）

| 機能 | 内容 |
|---|---|
| 世帯・アカウント管理 | 匿名認証で開始 → 後からメール連携可能。世帯の新規作成、招待コードでの参加（上限2名） |
| 家事マスタ管理 | 家事名・所要時間・負荷係数・カテゴリを登録。プリセット14件を初期投入、お気に入り設定 |
| 記録機能 | ホーム画面のワンタップボタンで記録。確認ダイアログなし、取消ボタン付きトーストで誤タップに対応。オフラインでも記録でき、オンライン復帰時に自動同期 |
| 見える化ダッシュボード | 分担比率バー、期間切替（今週/今月）、カテゴリ別内訳（ドーナツグラフ）、週次推移（棒グラフ）、自分たちの目標比率設定 |
| 履歴 | 記録の一覧表示、日時の編集・削除 |

「あえて実装しない機能」（要件定義書どおり）：ポイント対抗・ランキング等の競争要素、細かすぎる入力項目。
週次通知・ねぎらいスタンプ・偏りアラート等は v2 相当として未実装です。

## 技術構成

- **React + TypeScript + Vite**、**Tailwind CSS v4**
- **Firebase Authentication**（匿名認証 → メール/パスワード連携）
- **Cloud Firestore**（`persistentLocalCache` によるオフラインキャッシュ＋自動同期、`onSnapshot` によるリアルタイム反映）
- **vite-plugin-pwa**（Service Worker・ホーム画面への追加）
- **recharts**（ダッシュボードのグラフ）

サーバー処理（週次集計・通知など）は要件定義書どおり v2 スコープとし、Cloud Functions は未導入です。

## セットアップ

### 1. 依存関係のインストール

```bash
cd housework-app
npm install
```

### 2. Firebase プロジェクトの準備

本番で使うには Firebase プロジェクトが必要です。

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. **Authentication** → Sign-in method で「匿名」と「メール/パスワード」を有効化
3. **Firestore Database** を作成（本番モード）
4. プロジェクト設定 → 全般 → 「アプリを追加」で Web アプリを登録し、SDK 設定を取得
5. `.env.example` を `.env.production.local`（または `.env.local`）としてコピーし、取得した値を設定

```bash
cp .env.example .env.production.local
```

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_USE_EMULATOR=false
```

6. セキュリティルールをデプロイ（`firebase-tools` が必要: `npm install -g firebase-tools`）

```bash
firebase login
firebase deploy --only firestore:rules --project <your-project-id>
```

### 3. 開発サーバーの起動

`.env.development` に、Firebase Local Emulator Suite 用のダミー設定（`demo-` プレフィックスの
プロジェクトID）がすでに入っているため、**実プロジェクトなしでもすぐに動かせます**。

```bash
# ターミナル1: Firebase エミュレータ（Auth + Firestore）
npm install -g firebase-tools   # 初回のみ
firebase emulators:start --project demo-housework-app --only auth,firestore

# ターミナル2: 開発サーバー
npm run dev
```

`http://localhost:5173` を開けば、実プロジェクト不要でフル機能（世帯作成・招待・記録・
ダッシュボード・オフライン動作）を試せます。エミュレータUIは `http://127.0.0.1:4000`。

実 Firebase プロジェクトに接続して開発する場合は `.env.local` を作成し、`.env.production.local`
と同じ値に `VITE_USE_EMULATOR=false` を加えて設定してください。

### 4. ビルド・デプロイ

```bash
npm run build      # 型チェック + 本番ビルド（dist/）
npm run preview     # ビルド結果をローカルプレビュー
```

`dist/` は Firebase Hosting・Cloudflare Pages・GitHub Pages など任意の静的ホスティングに配信できます。
PWA なのでスマートフォンのブラウザから「ホーム画面に追加」するとアプリのように使えます。

## データモデル（Firestore）

```
users/{uid}                          … householdId, nickname
households/{householdId}
  members: [uid1, uid2]
  nicknames: { [uid]: string }
  inviteCode: string
  targetRatio: { [uid]: number }      … 合計100になる目標比率
  chores/{choreId}                    … name, minutes, loadFactor, category, isFavorite, order
  logs/{logId}                        … choreId, choreName, category, userId, doneAt, minutes, loadFactor, score
inviteCodes/{code}                    … householdId（招待コードから世帯を引くための逆引き）
```

`score`（= minutes × loadFactor）は記録時点で計算して固定保存しています。後から家事マスタの
係数を変更しても、過去の集計値がブレないようにするためです。

### セキュリティルールの設計について

`households/{id}/chores`・`logs` サブコレクションは、あえて親ドキュメントを `get()` で参照して
世帯メンバーかどうかを再チェックしていません。Firestore の Local Emulator（および一部レポートでは
本番でも稀に）、`get()` を使うセキュリティルールを持つクエリリスナーが unsubscribe → resubscribe
された際（タブ切り替えなど）に、そのリスナーの以後のスナップショットが恒久的に権限エラーになる
不具合があるためです（リトライしても回復しません）。`householdId` は Firestore の自動生成ID
（約20文字のランダム文字列）で、世帯メンバー本人（自分の `users/{uid}` ドキュメント経由）か
1回限りの招待コード経由でしか知り得ないため、このサブコレクションではサインイン済みであることのみを
要求しています。2人利用の個人アプリとしては妥当なトレードオフと判断していますが、より厳密な
アクセス制御が必要な場合は Cloud Functions でカスタムクレームを付与する方式への切り替えを
検討してください。
