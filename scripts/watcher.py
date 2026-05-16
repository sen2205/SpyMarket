import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from scraper import PayPayScraper
from notifier import Notifier
from analyzer import ItemAnalyzer

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

class SpyMarketWatcher:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.scraper = PayPayScraper(headless=True)
        self.notifier = Notifier()
        self.analyzer = ItemAnalyzer()

    async def run(self, loop_count: int = 1):
        for i in range(loop_count):
            print(f"Starting monitoring cycle {i+1}/{loop_count}...")
            
            # 1. 監視設定 & 通知サブスクリプション & 通知済みリストの取得
            try:
                settings_query = self.supabase.table("watch_settings").select("*").eq("is_active", True).execute()
                settings_list = settings_query.data
                
                subs_query = self.supabase.table("push_subscriptions").select("*").execute()
                subs_list = subs_query.data or []
                subscriptions = [s["subscription"] for s in subs_list]

                # 通知済みIDの取得（重複スクレイピング防止）
                notified_query = self.supabase.table("notified_items").select("item_id").execute()
                exclude_ids = [item["item_id"] for item in notified_query.data] if notified_query.data else []

                if not settings_list:
                    print("No active watch settings found.")
                else:
                    for settings in settings_list:
                        keyword = settings["keyword_and"]
                        min_price = settings.get("min_price", 0)
                        max_price = settings.get("max_price", 9999999)
                        
                        print(f"Monitoring: {keyword} ({min_price} - {max_price} yen)")
                        
                        # 2. スクレイピング実行（通知済みIDを渡して詳細チェックをスキップ）
                        found_items = await self.scraper.search(
                            keyword, 
                            settings.get("keyword_not", ""), 
                            min_price, 
                            max_price,
                            exclude_ids=exclude_ids
                        )
                        
                        for item in found_items:
                            # 3. 重複チェック
                            item_id = item["id"]
                            if item_id in exclude_ids:
                                continue
                                
                            check = self.supabase.table("notified_items").select("item_id").eq("item_id", item_id).execute()
                            
                            if not check.data:
                                # 4. LLMによる詳細分析
                                print(f"Analyzing item with LLM: {item['title']}...")
                                analysis = self.analyzer.analyze(item, settings)
                                
                                if not analysis.get("is_match", True):
                                    print(f"LLM determined item is NOT a match: {analysis.get('match_reason')}")
                                    continue

                                # 5. 未通知なら通知 & DB保存
                                print(f"New item found: {item['title']} - {item['price']} yen")
                                expired_indices = self.notifier.notify_item(item, subscriptions, settings, analysis)
                                
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
                                
                                # このサイクルで見つかったものをexclude_idsに追加して次の設定で重複しないようにする
                                exclude_ids.append(item_id)
            except Exception as e:
                error_msg = f"Error in monitoring cycle: {e}"
                print(error_msg)
                self.notifier.send_error(error_msg)

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
