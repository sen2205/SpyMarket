# SpyMarket 🕵️

PayPayフリマ 自動監視・通知システム

## 概要

PayPayフリマの商品を定期的に監視し、条件に合う新着商品をLINE/Discordへ通知します。

## 技術スタック

- **監視エンジン**: Python 3.11+, Playwright (Headless)
- **データベース**: Supabase (PostgreSQL)
- **通知**: LINE Notify API / Discord Webhook
- **インフラ**: GitHub Actions (Scheduler)
- **フロントエンド**: Next.js (App Router), Tailwind CSS

## セットアップ

### 1. Python環境

```bash
pip install -r requirements.txt
playwright install chromium
```

### 2. 環境変数

`.env` ファイルを作成（`.env.example` を参照）:

```bash
cp .env.example .env
# .env を編集して各値を設定
```

### 3. Supabase セットアップ

`supabase/schema.sql` をSupabaseのSQL Editorで実行してテーブルを作成します。

### 4. 動作確認

```bash
# Phase 1: スクレイピング単体テスト
python scripts/scraper_test.py

# Phase 2: フル動作（Supabase + 通知）
python scripts/watcher.py
```

## GitHub Actions

`.github/workflows/watcher.yml` で10分おきに自動実行されます。

Secrets に以下を設定してください:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `LINE_NOTIFY_TOKEN`（任意）
- `DISCORD_WEBHOOK_URL`（任意）

## フロントエンド（Phase 4）

```bash
cd dashboard
npm install
npm run dev
```

## ディレクトリ構成

```
SpyMarket/
├── scripts/
│   ├── watcher.py          # メイン監視スクリプト
│   ├── scraper.py          # PayPayフリマスクレイパー
│   ├── notifier.py         # LINE/Discord通知
│   └── scraper_test.py     # 単体テスト用
├── supabase/
│   └── schema.sql          # DBスキーマ
├── dashboard/              # Next.js フロントエンド (Phase 4)
├── .github/
│   └── workflows/
│       └── watcher.yml     # GitHub Actions設定
├── .env.example
├── requirements.txt
└── README.md
```
