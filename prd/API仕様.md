# API仕様書: Multi Channel Reply Support Tool

## 1. 概要
本ドキュメントは、拡張機能のバックグラウンドスクリプトからGoogle Gemini APIへリクエストを送信し、返信案テキストを取得するためのAPI仕様を定義する。

## 2. エンドポイント情報

- **API:** Google AI Gemini API
- **HTTP Method:** `POST`
- **Endpoint URL:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`

## 3. 認証
- **方式:** APIキー認証
- **ヘッダー:** HTTPリクエストのヘッダーに以下のキーと値を追加する。
  - `x-goog-api-key`: `YOUR_API_KEY` (ユーザーが設定画面から入力したAPIキー)

## 4. リクエスト仕様

### 4.1. リクエストボディ (JSON)
会話の文脈と生成設定をJSON形式で送信する。

    {
      "contents": [
        // --- 会話履歴 ---
        {
          "role": "user",
          "parts": [{ "text": "昨日お問い合わせした件、いかがでしょうか？" }]
        },
        {
          "role": "model",
          "parts": [{ "text": "お問い合わせありがとうございます。確認し、本日中にご返信いたします。" }]
        },
        {
          "role": "user",
          "parts": [{ "text": "承知しました。お待ちしております。" }]
        }
        // ... conversation history from cache
      ],
      "generationConfig": {
        "temperature": 0.7,
        "topK": 1,
        "topP": 1,
        "maxOutputTokens": 2048
      },
      "safetySettings": [
        {
          "category": "HARM_CATEGORY_HARASSMENT",
          "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          "category": "HARM_CATEGORY_HATE_SPEECH",
          "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
          "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    }

### 4.2. 主要パラメータ説明
- **`contents`**: `Array<Object>`
  - 会話の履歴を配列で指定する。`role` (`user` または `model`) と `parts` (テキスト本文) を交互に設定し、文脈をAIに伝える。
- **`generationConfig`**: `Object`
  - **`temperature`**: 出力のランダム性を制御する（0に近いほど決定的、1に近いほど多様）。
  - **`maxOutputTokens`**: 生成されるテキストの最大長。
- **`safetySettings`**: `Array<Object>`
  - 有害なコンテンツをブロックするための安全設定。

## 5. レスポンス仕様

### 5.1. 成功時レスポンス (200 OK)
生成されたテキストは `candidates` 配列内に格納されて返却される。

    {
      "candidates": [
        {
          "content": {
            "parts": [
              {
                "text": "ご連絡ありがとうございます。大変お待たせいたしました。お問い合わせの件についてですが、..."
              }
            ],
            "role": "model"
          },
          "finishReason": "STOP",
          "index": 0,
          "safetyRatings": [
            // ... safety rating details
          ]
        }
      ],
      "usageMetadata": {
        "promptTokenCount": 50,
        "candidatesTokenCount": 120,
        "totalTokenCount": 170
      }
    }

- **取得するデータ:** `candidates[0].content.parts[0].text` のパスから、生成された返信案テキストを抽出する。

### 5.2. エラー時レスポンス
- **400 Bad Request:** リクエストボディの形式が不正（`contents`の形式が違うなど）。
- **403 Forbidden / 401 Unauthorized:** APIキーが無効、または権限がない。
- **500 Internal Server Error:** Gemini API側のサーバーで問題が発生。