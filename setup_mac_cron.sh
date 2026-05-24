#!/bin/bash
# ============================================================
# SpyMarket - Mac セットアップスクリプト
# 10分おきに自動監視を開始します
# 使い方: bash setup_mac_cron.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
VENV_DIR="$SCRIPT_DIR/.venv"
PYTHON_SCRIPT="$SCRIPT_DIR/scripts/watcher.py"
CRON_LOG="$LOG_DIR/watcher.log"

echo "=================================================="
echo " SpyMarket Mac Cron セットアップ"
echo "=================================================="
echo "プロジェクトディレクトリ: $SCRIPT_DIR"

# ログディレクトリ作成
mkdir -p "$LOG_DIR"
echo "✅ ログディレクトリ作成: $LOG_DIR"

# Python確認
if ! command -v python3 &>/dev/null; then
    echo "❌ python3 が見つかりません。brew install python3 で入れてください。"
    exit 1
fi
PYTHON_PATH=$(command -v python3)
echo "✅ Python: $PYTHON_PATH"

# venvがなければ作成
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 venv を作成中..."
    python3 -m venv "$VENV_DIR"
fi
echo "✅ venv: $VENV_DIR"

# 依存パッケージインストール
echo "📦 依存パッケージをインストール中..."
"$VENV_DIR/bin/pip" install --quiet --upgrade pip
"$VENV_DIR/bin/pip" install --quiet -r "$SCRIPT_DIR/requirements.txt"

# Playwright ブラウザインストール
echo "🌐 Playwright ブラウザをインストール中（初回のみ）..."
"$VENV_DIR/bin/python" -m playwright install chromium

echo "✅ 依存パッケージのインストール完了"

# run_watcher.sh を作成（cron から呼ばれるラッパー）
RUN_SCRIPT="$SCRIPT_DIR/run_watcher.sh"
cat > "$RUN_SCRIPT" << EOF
#!/bin/bash
# cron から呼ばれるラッパースクリプト
SCRIPT_DIR="$SCRIPT_DIR"
LOG_FILE="$LOG_DIR/watcher.log"

# ログローテーション（10MB超えたらリセット）
if [ -f "\$LOG_FILE" ] && [ \$(stat -f%z "\$LOG_FILE" 2>/dev/null || echo 0) -gt 10485760 ]; then
    mv "\$LOG_FILE" "\$LOG_FILE.old"
fi

cd "\$SCRIPT_DIR/scripts"
source "$VENV_DIR/bin/activate"

echo "" >> "\$LOG_FILE"
echo "========================================" >> "\$LOG_FILE"
echo "▶ 実行開始: \$(date '+%Y-%m-%d %H:%M:%S')" >> "\$LOG_FILE"
echo "========================================" >> "\$LOG_FILE"

python watcher.py 1 >> "\$LOG_FILE" 2>&1

EXIT_CODE=\$?
echo "▶ 終了: \$(date '+%Y-%m-%d %H:%M:%S') (exit: \$EXIT_CODE)" >> "\$LOG_FILE"
EOF
chmod +x "$RUN_SCRIPT"
echo "✅ run_watcher.sh 作成完了"

# .env ファイル確認
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo ""
    echo "⚠️  .env ファイルが見つかりません！"
    echo "   .env.example をコピーして必要な値を設定してください:"
    echo "   cp $SCRIPT_DIR/.env.example $SCRIPT_DIR/.env"
    echo ""
fi

# crontab に登録（*/10 * * * * = 10分おきに実行）
CRON_ENTRY="*/10 * * * * $RUN_SCRIPT"

# 既存のcrontabに同じエントリがあれば削除してから追加
EXISTING_CRON=$(crontab -l 2>/dev/null || true)
FILTERED_CRON=$(echo "$EXISTING_CRON" | grep -v "run_watcher.sh" || true)

if [ -z "$FILTERED_CRON" ]; then
    echo "$CRON_ENTRY" | crontab -
else
    { echo "$FILTERED_CRON"; echo "$CRON_ENTRY"; } | crontab -
fi

echo ""
echo "=================================================="
echo "✅ crontab 登録完了！"
echo "=================================================="
echo ""
echo "⏰ 10分おきに自動実行されます"
echo ""
echo "📋 現在のcrontab:"
crontab -l
echo ""
echo "📝 ログ確認コマンド:"
echo "   tail -f $LOG_DIR/watcher.log"
echo ""
echo "🛑 監視を止めるには:"
echo "   crontab -e  (該当行を削除)"
echo "   または: crontab -r  (全crontab削除)"
echo ""
echo "🧪 今すぐテスト実行するには:"
echo "   bash $RUN_SCRIPT"
echo ""
