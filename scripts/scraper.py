import asyncio
import re
from typing import List, Dict, Optional
from playwright.async_api import async_playwright
import os

class PayPayScraper:
    BASE_URL = "https://paypayfleamarket.yahoo.co.jp"

    def __init__(self, headless: bool = True):
        self.headless = headless

    async def search(self, keyword_and: str, keyword_not: str = "", min_price: int = 0, max_price: int = 9999999, exclude_ids: List[str] = None) -> List[Dict]:
        """
        PayPayフリマをスクレイピングして商品情報を取得する
        """
        if exclude_ids is None:
            exclude_ids = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()

            # URL用の検索キーワード（カンマをスペースに変換して検索効率を上げる）
            search_query = keyword_and.replace(",", " ")
            encoded_query = search_query.replace(" ", "%20")
            search_url = f"{self.BASE_URL}/search/{encoded_query}?minPrice={min_price}&maxPrice={max_price}&open=1"
            
            print(f"Searching: {search_url}")
            
            # 判定用のキーワードリスト（カンマ区切り）
            include_tags = [k.strip().lower() for k in keyword_and.split(",") if k.strip()]
            exclude_tags = [k.strip().lower() for k in keyword_not.split(",") if k.strip()]
            
            try:
                await page.goto(search_url, wait_until="networkidle", timeout=30000)
                
                results = []
                # 検索結果のアイテム要素を取得
                item_elements = await page.query_selector_all('div[class*="SearchGrid"] a[href^="/item/"], #search-results a[href^="/item/"], div[class*="items_SearchItems"] a[href^="/item/"]')
                if not item_elements:
                    item_elements = await page.query_selector_all('main a[href^="/item/"]')
                
                # 最新10件に絞って詳細チェック
                for el in item_elements[:10]:
                    try:
                        href = await el.get_attribute("href")
                        if not href: continue
                        item_id = href.split('/')[-1]
                        
                        # すでに通知済みの場合は詳細チェックをスキップ
                        if item_id in exclude_ids:
                            continue

                        # SOLDラベルの簡易チェック（リスト画面）
                        is_sold_fast = await el.query_selector('text="SOLD"')
                        if is_sold_fast: continue

                        # タイトルと画像
                        img_el = await el.query_selector('img')
                        title = await img_el.get_attribute("alt") if img_el else "No Title"
                        image_url = await img_el.get_attribute("src") if img_el else ""
                        
                        # 価格
                        price_el = await el.query_selector('p[class*="Price"]') or await el.query_selector('p')
                        price_text = await price_el.inner_text() if price_el else "0"
                        price = int(re.sub(r'[^\d]', '', price_text)) if price_text else 0

                        # 個別ページに飛んで説明文を取得
                        detail_url = f"{self.BASE_URL}/item/{item_id}"
                        detail_page = await context.new_page()
                        try:
                            await detail_page.goto(detail_url, wait_until="domcontentloaded", timeout=15000)
                            
                            # 説明文の取得
                            desc_el = await detail_page.query_selector('.ItemText__Text, [class*="ItemText__Text"], [class*="ItemDescription__container"]')
                            description = await desc_el.inner_text() if desc_el else ""
                            
                            # 判定対象テキスト
                            full_text = (title + " " + description).lower()
                            
                            # 精密な売り切れチェック
                            is_sold_detail = await detail_page.query_selector('text="完売しました"')
                            if is_sold_detail:
                                await detail_page.close()
                                continue

                            # キーワード判定（すべて含まれているか）
                            if not all(tag in full_text for tag in include_tags):
                                await detail_page.close()
                                continue
                                
                            # 除外ワード判定（一つでもあればアウト）
                            if any(tag in full_text for tag in exclude_tags):
                                await detail_page.close()
                                continue

                        except Exception as e:
                            print(f"Error checking detail page {item_id}: {e}")
                        finally:
                            await detail_page.close()

                        results.append({
                            "id": item_id,
                            "title": title,
                            "price": price,
                            "url": detail_url,
                            "image_url": image_url,
                            "description": description
                        })
                        
                    except Exception as e:
                        print(f"Error parsing item in list: {e}")
                        continue
                
                return results

            except Exception as e:
                print(f"Scraping error: {e}")
                return []
            finally:
                await browser.close()

if __name__ == "__main__":
    async def test():
        scraper = PayPayScraper(headless=True)
        # テスト実行
        results = await scraper.search("iphone 15", "ジャンク,画面割れ", max_price=150000)
        for item in results:
            print(f"Found: {item['title']} - {item['price']}円")
            
    asyncio.run(test())
