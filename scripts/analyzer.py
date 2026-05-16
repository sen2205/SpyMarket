import os
from typing import Dict, Optional
from groq import Groq
import json

class ItemAnalyzer:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if self.api_key:
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None

    def analyze(self, item: Dict, settings: Dict) -> Dict:
        """
        LLMを使用して商品の詳細を分析する
        """
        if not self.client:
            return {"is_match": True, "reason": "LLM API Key not set", "advice": ""}

        title = item.get("title", "")
        description = item.get("description", "")
        price = item.get("price", 0)
        keyword = settings.get("keyword_and", "")
        
        prompt = f"""
あなたはフリマアプリのベテランバイヤーです。
以下の商品が、ユーザーの探している条件に合致しているか、また購入時に注意すべき点は何かを分析してください。

【ユーザーの検索条件】
キーワード: {keyword}
希望価格帯: {settings.get('min_price', 0)} 〜 {settings.get('max_price', 9999999)}円

【商品情報】
タイトル: {title}
価格: {price}円
説明文:
{description[:1500]}  # 長すぎる場合はカット

以下のJSON形式で回答してください。
{{
  "is_match": true/false,
  "match_reason": "合致している（またはしていない）理由を簡潔に",
  "summary": "商品の状態や特徴の要約",
  "advice": "購入時に注意すべき点（例：付属品の欠品、傷、配送方法など）"
}}
"""

        chat_completion = self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional flea market item analyzer. Always respond in valid JSON format."
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
        )
        
        result = json.loads(chat_completion.choices[0].message.content)
        return result
