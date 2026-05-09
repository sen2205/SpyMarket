import requests
import os
import json
from typing import Optional, List
from pywebpush import webpush, WebPushException

class Notifier:
    def __init__(self, line_token: Optional[str] = None, discord_webhook_url: Optional[str] = None):
        self.line_token = line_token or os.getenv("LINE_NOTIFY_TOKEN")
        self.discord_webhook_url = discord_webhook_url or os.getenv("DISCORD_WEBHOOK_URL")
        self.vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
        self.vapid_claims = {"sub": "mailto:sen2205www@gmail.com"}

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

    def send_web_push(self, subscription: dict, title: str, message: str, url: str):
        if not self.vapid_private_key:
            print("VAPID_PRIVATE_KEY not set.")
            return

        try:
            webpush(
                subscription_info=subscription,
                data=json.dumps({
                    "title": title,
                    "body": message,
                    "url": url,
                    "icon": "/icons/icon-192x192.png"
                }),
                vapid_private_key=self.vapid_private_key,
                vapid_claims=self.vapid_claims
            )
            print("Web Push notification sent.")
        except WebPushException as ex:
            print(f"Web Push error: {ex}")
            # もし 410 Gone なら、そのサブスクリプションは無効なので削除すべき
            if ex.response and ex.response.status_code == 410:
                return "expired"
        except Exception as e:
            print(f"Error sending Web Push: {e}")
        return "success"

    def notify_item(self, item: dict, subscriptions: List[dict] = None):
        """全てのチャンネルへ通知"""
        title = item.get("title", "商品なし")
        price = item.get("price", 0)
        url = item.get("url", "")
        
        # LINE用メッセージ
        line_msg = f"\n💰新着アイテム\n{title}\n価格: {price:,}円\n{url}"
        self.send_line(line_msg)
        
        # Discord用
        self.send_discord(title, price, url)

        # Web Push用
        if subscriptions:
            push_title = "💰 新着アイテム発見！"
            push_msg = f"{title}\n価格: {price:,}円"
            expired_indices = []
            for i, sub in enumerate(subscriptions):
                result = self.send_web_push(sub, push_title, push_msg, url)
                if result == "expired":
                    expired_indices.append(i)
            return expired_indices
        return []
