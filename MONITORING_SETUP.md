# SpyMarket 監視システム

## 🚀 監視の始め方（Mac編）

### 1. リポジトリをMacにクローン（またはコピー）
```bash
git clone https://github.com/sen2205/SpyMarket.git
cd SpyMarket
```

### 2. .env ファイルを設定
```bash
cp .env.example .env
nano .env   # または VSCode で編集
```

必要な項目：
- `SUPABASE_URL` / `SUPABASE_KEY`
- `DISCORD_WEBHOOK_URL`（通知先）
- `GROQ_API_KEY`（LLM分析用）

### 3. セットアップスクリプトを実行（1回だけ）
```bash
bash setup_mac_cron.sh
```

これで **10分おきに自動監視** が始まります ✅

### ログの確認
```bash
tail -f logs/watcher.log
```

### 監視を止めるには
```bash
crontab -e   # 該当行を削除
```

---

## ☁️ クラウドで動かす場合（Render.com）

### 1. [render.com](https://render.com) でアカウント作成

### 2. GitHubリポジトリを連携

### 3. 「New Cron Job」を選択
- Repository: このリポジトリ
- Render will auto-detect `render.yaml`

### 4. 環境変数を設定
Render ダッシュボードで以下を設定：
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `DISCORD_WEBHOOK_URL`
- `GROQ_API_KEY`
- その他 .env.example 参照

### 5. デプロイ完了 → 10分おきに自動実行

---

## ❌ GitHub Actions を使わない理由

GitHub Actions の `schedule` は**信頼性が低く**、公式でも遅延を認めています。
10分間隔の監視には適していません。
