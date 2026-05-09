-- 監視設定テーブル
CREATE TABLE watch_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_and TEXT NOT NULL,         -- 必須ワード（スペース区切り）
    keyword_not TEXT,                  -- 除外ワード（スペース区切り）
    min_price INTEGER DEFAULT 0,       -- 最低価格
    max_price INTEGER DEFAULT 9999999, -- 最高価格
    is_active BOOLEAN DEFAULT TRUE,    -- 監視の有効/無効
    search_description BOOLEAN DEFAULT FALSE, -- 説明文も検索対象にするか
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通知済み商品テーブル
CREATE TABLE notified_items (
    item_id TEXT PRIMARY KEY,          -- 商品固有ID（PayPayフリマの商品ID）
    title TEXT,                        -- タイトル（参考用）
    url TEXT,                          -- URL（参考用）
    price INTEGER,                     -- 価格（参考用）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) の設定（必要に応じて調整）
ALTER TABLE watch_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notified_items ENABLE ROW LEVEL SECURITY;

-- 全員に読み書きを許可するポリシー（開発用：本番では修正が必要）
CREATE POLICY "Public full access watch_settings" ON watch_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access notified_items" ON notified_items FOR ALL USING (true) WITH CHECK (true);
