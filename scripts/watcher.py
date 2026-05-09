import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from scraper import PayPayScraper
from notifier import Notifier

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

class SpyMarketWatcher:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.scraper = PayPayScraper(headless=True)
        self.notifier = Notifier()

    async def run(self):
        print("Starting monitoring cycle...")
        
        # 1. 監視設定の取得
        settings_query = self.supabase.table("watch_settings").select("*").eq("is_active", True).execute()
        settings_list = settings_query.data
        
        if not settings_list:
            print("No active watch settings found.")
            return

        for settings in settings_list:
            keyword = settings["keyword_and"]
            exclude_keywords = settings.get("keyword_not", "").split() if settings.get("keyword_not") else []
            min_price = settings.get("min_price", 0)
            max_price = settings.get("max_price", 9999999)
            
            print(f"Monitoring: {keyword} ({min_price} - {max_price} yen)")
            
            # 2. スクレイピング実行
            found_items = await self.scraper.search(keyword, min_price, max_price)
            
            for item in found_items:
                # 3. フィルタリング (除外ワード)
                should_skip = False
                for ex in exclude_keywords:
                    if ex.lower() in item["title"].lower():
                        should_skip = True
                        break
                if should_skip:
                    continue
                
                # 4. 重複チェック (Supabase)
                item_id = item["id"]
                check = self.supabase.table("notified_items").select("item_id").eq("item_id", item_id).execute()
                
                if not check.data:
                    # 5. 未通知なら通知 & DB保存
                    print(f"New item found: {item['title']} - {item['price']} yen")
                    self.notifier.notify_item(item)
                    
                    self.supabase.table("notified_items").insert({
                        "item_id": item_id,
                        "title": item["title"],
                        "url": item["url"],
                        "price": item["price"],
                        "image_url": item.get("image_url", ""),
                        "setting_id": settings["id"]
                    }).execute()
                else:
                    # すでに通知済み
                    pass

        print("Monitoring cycle completed.")

if __name__ == "__main__":
    watcher = SpyMarketWatcher()
    asyncio.run(watcher.run())
