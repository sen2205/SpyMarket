import requests
import os
from typing import Optional

class Notifier:
    def __init__(self, line_token: Optional[str] = None, discord_webhook_url: Optional[str] = None):
        self.line_token = line_token or os.getenv("LINE_NOTIFY_TOKEN")
        self.discord_webhook_url = discord_webhook_url or os.getenv("DISCORD_WEBHOOK_URL")

    def send_line(self, message: str):
        if not self.line_token:
            return
        
        url = "https://notify-api.line.me/api/notify"
        headers = {"Authorization": f"Bearer {self.line_token}"}
        data = {"message": message}
        try:
            response = requests.post(url, headers=headers, data=data)
            response.raise_for_status()
            print("LINE notification sent.")
        except Exception as e:
            print(f"Error sending LINE notification: {e}")

    def send_discord(self, title: str, price: int, item_url: str):
        if not self.discord_webhook_url:
            return
        
        payload = {
            "embeds": [
                {
                    "title": f"💰新着アイテム: {title}",
                    "description": f"価格: {price:,}円\n[商品ページはこちら]({item_url})",
                    "color": 5814783,  # Discord Blue-ish
                    "url": item_url
                }
            ]
        }
        try:
            response = requests.post(self.discord_webhook_url, json=payload)
            response.raise_for_status()
            print("Discord notification sent.")
        except Exception as e:
            print(f"Error sending Discord notification: {e}")

    def notify_item(self, item: dict):
        """両方のチャンネルへ通知"""
        title = item.get("title", "商品なし")
        price = item.get("price", 0)
        url = item.get("url", "")
        
        # LINE用メッセージ
        line_msg = f"\n💰新着アイテム\n{title}\n価格: {price:,}円\n{url}"
        self.send_line(line_msg)
        
        # Discord用
        self.send_discord(title, price, url)
