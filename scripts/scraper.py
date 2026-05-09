import asyncio
import re
from typing import List, Dict, Optional
from playwright.async_api import async_playwright
import os

class PayPayScraper:
    BASE_URL = "https://paypayfleamarket.yahoo.co.jp"

    def __init__(self, headless: bool = True):
        self.headless = headless

    async def search(self, keyword: str, min_price: int = 0, max_price: int = 9999999) -> List[Dict]:
        """
        PayPayフリマをスクレイピングして商品情報を取得する
        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()

            # URL構築
            # スペースを%20に変換し、販売中のみ(&open=1)を指定
            encoded_keyword = keyword.replace(" ", "%20")
            search_url = f"{self.BASE_URL}/search/{encoded_keyword}?minPrice={min_price}&maxPrice={max_price}&open=1"
            
            print(f"Searching: {search_url}")
            
            try:
                await page.goto(search_url, wait_until="networkidle", timeout=30000)
                
                items = []
                # 検索結果エリア（メインのグリッド）に絞り込む
                item_elements = await page.query_selector_all('div[class*="SearchGrid"] a[href^="/item/"], #search-results a[href^="/item/"], div[class*="items_SearchItems"] a[href^="/item/"]')
                
                if not item_elements:
                    item_elements = await page.query_selector_all('main a[href^="/item/"]')
                
                # キーワード群（スペース区切り）を取得
                keywords = [k.lower() for k in keyword.split() if k]
                
                for el in item_elements:
                    try:
                        href = await el.get_attribute("href")
                        if not href: continue
                            
                        # タイトル (imgのalt属性)
                        img_el = await el.query_selector('img')
                        title = await img_el.get_attribute("alt") if img_el else "No Title"
                        image_url = await img_el.get_attribute("src") if img_el else ""
                        
                        # 精度向上: 商品名にキーワードのすべてが含まれていなければスキップ（完璧なAND一致）
                        if not all(k in title.lower() for k in keywords):
                            continue

                        item_id = href.split('/')[-1]
                        url = f"{self.BASE_URL}{href}"
                        
                        # 売り切れチェック
                        # "SOLD" というテキストを含む要素があるか確認
                        is_sold = await el.query_selector('text="SOLD"')
                        if is_sold:
                            continue

                        # 価格 (<p>タグ内のテキスト)
                        price_el = await el.query_selector('p')
                        price_text = await price_el.inner_text() if price_el else "0"
                        # 数字のみ抽出
                        price = int(re.sub(r'[^\d]', '', price_text)) if price_text else 0
                        
                        items.append({
                            "id": item_id,
                            "title": title,
                            "price": price,
                            "url": url,
                            "image_url": image_url
                        })
                    except Exception as e:
                        print(f"Error parsing item: {e}")
                        continue
                
                return items

            except Exception as e:
                print(f"Scraping error: {e}")
                return []
            finally:
                await browser.close()

if __name__ == "__main__":
    # 単体テスト用
    async def test():
        scraper = PayPayScraper(headless=True)
        results = await scraper.search("iphone", max_price=50000)
        for item in results[:5]:
            print(item)
            
    asyncio.run(test())
