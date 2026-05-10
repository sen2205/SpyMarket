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

    async def run(self, loop_count: int = 1):
        for i in range(loop_count):
            print(f"Starting monitoring cycle {i+1}/{loop_count}...")
            
            # 1. 監視設定 & 通知サブスクリプションの取得
            try:
                settings_query = self.supabase.table("watch_settings").select("*").eq("is_active", True).execute()
                settings_list = settings_query.data
                
                subs_query = self.supabase.table("push_subscriptions").select("*").execute()
                subs_list = subs_query.data or []
                subscriptions = [s["subscription"] for s in subs_list]

                if not settings_list:
                    print("No active watch settings found.")
                else:
                    for settings in settings_list:
                        keyword = settings["keyword_and"]
                        min_price = settings.get("min_price", 0)
                        max_price = settings.get("max_price", 9999999)
                        
                        print(f"Monitoring: {keyword} ({min_price} - {max_price} yen)")
                        
                        # 2. スクレイピング実行
                        found_items = await self.scraper.search(
                            keyword, 
                            settings.get("keyword_not", ""), 
                            min_price, 
                            max_price
                        )
                        
                        for item in found_items:
                            # 3. 重複チェック
                            item_id = item["id"]
                            check = self.supabase.table("notified_items").select("item_id").eq("item_id", item_id).execute()
                            
                            if not check.data:
                                # 5. 未通知なら通知 & DB保存
                                print(f"New item found: {item['title']} - {item['price']} yen")
                                expired_indices = self.notifier.notify_item(item, subscriptions)
                                
                                if expired_indices:
                                    for idx in sorted(expired_indices, reverse=True):
                                        sub_id = subs_list[idx]["id"]
                                        self.supabase.table("push_subscriptions").delete().eq("id", sub_id).execute()
                                        print(f"Deleted expired subscription: {sub_id}")

                                self.supabase.table("notified_items").insert({
                                    "item_id": item_id,
                                    "title": item["title"],
                                    "url": item["url"],
                                    "price": item["price"],
                                    "image_url": item.get("image_url", ""),
                                    "setting_id": settings["id"]
                                }).execute()
            except Exception as e:
                print(f"Error in monitoring cycle: {e}")

            if i < loop_count - 1:
                print("Waiting 10 minutes for next cycle...")
                await asyncio.sleep(600)  # 600秒 = 10分

        print("All monitoring cycles completed.")

if __name__ == "__main__":
    watcher = SpyMarketWatcher()
    # GitHub Actions等の環境に合わせてループ回数を指定（例: 6回 = 1時間分）
    import sys
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    asyncio.run(watcher.run(loop_count=count))
