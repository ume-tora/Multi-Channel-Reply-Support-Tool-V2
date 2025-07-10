# Chrome Web Store 用アセット準備ガイド

## 🎯 Web Store 掲載要件

### 📋 必要なアセット一覧

| アセット種類 | サイズ | 形式 | 用途 | ステータス |
|-------------|--------|------|------|---------|
| **Small Icon** | 16x16px | PNG | ツールバー表示 | ✅ 生成済み |
| **Medium Icon** | 48x48px | PNG | 拡張機能管理画面 | ✅ 生成済み |
| **Large Icon** | 128x128px | PNG | Chrome Web Store | ✅ 生成済み |
| **Store Icon** | 440x280px | PNG/JPG | ストア一覧表示 | 🔄 作成予定 |
| **Screenshots** | 1280x800px | PNG/JPG | 機能紹介（最大5枚） | 🔄 作成予定 |
| **Promotional Tile** | 920x680px | PNG/JPG | おすすめ表示用 | 🔄 作成予定 |
| **Marquee** | 1400x560px | PNG/JPG | フィーチャー時表示 | 🔄 作成予定 |

---

## 🎨 アイコンデザイン仕様

### 現在のアイコン (`src/public/icons/icon.svg`)
```svg
<!-- AI返信サポートを象徴するデザイン -->
- メインカラー: #4285F4 (Google Blue)
- アクセントカラー: #34A853 (Google Green)
- シンボル: チャットバブル + AI回路パターン
- 可読性: 16px〜128pxで鮮明表示
```

### 自動生成済みPNGアイコン
- ✅ `dist/icons/icon16.png` - 16x16px
- ✅ `dist/icons/icon48.png` - 48x48px  
- ✅ `dist/icons/icon128.png` - 128x128px

---

## 📸 スクリーンショット撮影計画

### Screenshot 1: Gmail AI返信機能
**サイズ**: 1280x800px  
**内容**: Gmail画面でAI返信ボタンをクリックし、返信が生成される様子

**撮影手順**:
1. Gmail で適切なメールスレッドを開く
2. 画面ズーム: 100%
3. AI返信ボタンにマウスオーバー（ハイライト表示）
4. 生成された返信をポップアップで表示
5. 重要部分に矢印・注釈を追加

**注釈要素**:
- 🤖 AI返信ボタンの位置
- ⏱️ 「3秒で高品質な返信生成」
- 💬 生成された返信例

### Screenshot 2: マルチサービス対応
**サイズ**: 1280x800px  
**内容**: Gmail、Chatwork、Google Chat、LINEの4つのサービスを並べて表示

**レイアウト案**:
```
+----------+----------+
|  Gmail   | Chatwork |
|  🤖 AI   |  🤖 AI   |
+----------+----------+
| G.Chat   |   LINE   |
|  🤖 AI   |  🤖 AI   |
+----------+----------+
```

**注釈要素**:
- 🌐 「4つの主要サービスに対応」
- ⚡ 「統一された操作性」

### Screenshot 3: ドラッグ&ドロップ機能
**サイズ**: 1280x800px  
**内容**: 生成された返信をドラッグしてメール入力欄に移動する様子

**視覚効果**:
- ドラッグ中のカーソル表示
- 移動パスを示す矢印
- ドロップ先のハイライト

### Screenshot 4: 自動送信機能（安全性強調）
**サイズ**: 1280x800px  
**内容**: 確認ダイアログ付きの安全な自動送信機能

**安全性アピール**:
- 🛡️ 確認ダイアログの表示
- ✋ 「送信前の最終確認」
- 🔒 「誤送信防止機能」

### Screenshot 5: 設定・エラーハンドリング
**サイズ**: 1280x800px  
**内容**: APIキー設定画面とユーザーフレンドリーなエラー表示

**技術的信頼性**:
- ⚙️ 簡単な設定画面
- 🔑 安全なAPIキー管理
- 💡 親切なエラーメッセージ

---

## 🖼️ プロモーション画像デザイン

### Store Icon (440x280px)
**デザインコンセプト**: プロフェッショナルで信頼できるビジネスツール

```
背景: グラデーション (#4285F4 → #34A853)
メイン要素:
- 大きなAIアイコン (中央)
- 4つのサービスロゴ (Gmail, Chatwork, Google Chat, LINE)
- 「AI-Powered Reply Assistant」テキスト
フォント: Google Sans, 24px, Bold
```

### Promotional Tile (920x680px)
**レイアウト案**:
```
┌─────────────────────────────────────┐
│ Multi Channel Reply Support Tool   │
│                                     │
│ [🤖] AI-Powered Customer Support   │
│                                     │
│ ✅ Gmail   ✅ Chatwork              │
│ ✅ Google Chat   ✅ LINE Official   │
│                                     │
│ 🚀 3秒で高品質返信 | 🔒 安全設計    │
└─────────────────────────────────────┘
```

### Marquee (1400x560px)
**フィーチャー用の大型画像**:
- 左側: 機能デモのスクリーンショット
- 右側: 主要機能とベネフィット
- 下部: 「Chrome Web Storeで無料ダウンロード」

---

## 📝 機能説明文（Store Listing）

### Short Description (132文字以内)
```
Gmail、Chatwork、Google Chat、LINE Official AccountでAI返信生成。Gemini搭載で3秒以内の高品質返信。ドラッグ&ドロップ対応。
```

### Detailed Description
```markdown
# 🤖 Multi Channel Reply Support Tool - AI返信サポート

## ⚡ 3秒で高品質な返信を生成
Google GeminiのAI技術により、会話の文脈を理解した自然で適切な返信を瞬時に生成します。

## 🌐 主要4サービスに対応
- **Gmail**: メールスレッド分析による返信生成
- **Chatwork**: ビジネスチャット最適化
- **Google Chat**: チーム向けコミュニケーション
- **LINE Official Account**: カスタマーサポート特化

## 🎯 主な機能

### 🤖 AI返信生成
- 会話履歴を分析して文脈に沿った返信を自動生成
- 日本語ビジネス文書に最適化
- 3秒以内の高速レスポンス

### 🎨 ドラッグ&ドロップ
- 生成された返信を簡単にドラッグして入力欄に移動
- スムーズで直感的な操作性
- 時間短縮とワークフロー改善

### ⚡ 自動送信機能
- ワンクリックで返信を自動送信
- 確認ダイアログによる誤送信防止
- 安全性を重視した設計

### 🔒 セキュリティ・プライバシー
- Manifest V3準拠の最新セキュリティ基準
- ローカルストレージのみ使用（外部送信なし）
- 暗号化されたAPIキー管理

## 💼 ビジネス価値

### 効率性向上
- 返信時間を最大80%短縮
- 一貫性のある高品質な返信
- マルチタスク対応の向上

### コスト削減
- カスタマーサポート工数削減
- トレーニング時間の短縮
- 人的ミスの軽減

### 拡張性
- 新サービス対応の継続開発
- チーム利用での効果最大化
- 企業向けカスタマイズ対応

## 🚀 今すぐ始める

1. **インストール**: ワンクリックでChrome拡張機能を追加
2. **設定**: Google AI StudioでAPIキーを取得・設定
3. **利用開始**: 対応サービスで即座に利用可能

## 📞 サポート

- 📖 詳細マニュアル
- 🆘 包括的なFAQ
- 🐛 GitHub Issues サポート
- ⭐ 継続的な機能改善

**今すぐダウンロードして、AI による効率的な顧客対応を始めましょう！**
```

### Tags (適切なカテゴリ)
```
productivity, business, ai, email, chat, customer-support, 
gmail, automation, communication, workflow
```

---

## 🎨 デザインガイドライン

### カラーパレット
```css
/* メインカラー */
--primary-blue: #4285F4;      /* Google Blue */
--primary-green: #34A853;     /* Google Green */
--primary-red: #EA4335;       /* Google Red */
--primary-yellow: #FBBC04;    /* Google Yellow */

/* アクセントカラー */
--accent-dark: #1a73e8;       /* Dark Blue */
--accent-light: #e3f2fd;     /* Light Blue */

/* ニュートラル */
--text-primary: #202124;      /* Dark Gray */
--text-secondary: #5f6368;    /* Medium Gray */
--background: #ffffff;        /* White */
--border: #dadce0;           /* Light Gray */
```

### タイポグラフィ
```css
/* プライマリフォント */
font-family: 'Google Sans', 'Noto Sans JP', sans-serif;

/* サイズ指針 */
--title-large: 32px;         /* メインタイトル */
--title-medium: 24px;        /* セクションタイトル */
--body-large: 16px;          /* 本文 */
--body-small: 14px;          /* 注釈 */
--caption: 12px;             /* キャプション */
```

### アイコンスタイル
```css
/* アイコン仕様 */
stroke-width: 2px;           /* 線の太さ */
border-radius: 8px;          /* 角丸 */
padding: 8px;                /* 内側余白 */
box-shadow: 0 2px 8px rgba(0,0,0,0.1); /* 影 */
```

---

## 📋 制作チェックリスト

### アイコン
- [x] SVGオリジナル作成済み
- [x] PNG 16x16px 自動生成済み
- [x] PNG 48x48px 自動生成済み
- [x] PNG 128x128px 自動生成済み
- [ ] Store Icon 440x280px 作成
- [ ] 高解像度版 (Retina対応) 作成

### スクリーンショット
- [ ] Screenshot 1: Gmail AI返信 (1280x800px)
- [ ] Screenshot 2: マルチサービス対応 (1280x800px)
- [ ] Screenshot 3: ドラッグ&ドロップ (1280x800px)
- [ ] Screenshot 4: 自動送信機能 (1280x800px)
- [ ] Screenshot 5: 設定画面 (1280x800px)

### プロモーション画像
- [ ] Promotional Tile 920x680px
- [ ] Marquee 1400x560px
- [ ] アニメーションGIF（オプション）

### テキストコンテンツ
- [x] Short Description (132文字)
- [x] Detailed Description
- [x] Feature List
- [x] Tags/Keywords
- [ ] 多言語対応（英語版）

### 品質確認
- [ ] 全画像の最適化（PNGCrush/TinyPNG）
- [ ] 色彩コントラスト確認（WCAG準拠）
- [ ] 文字読みやすさテスト
- [ ] モバイル表示確認

---

## 🚀 Web Store 登録手順

### 1. 開発者アカウント
```
1. Chrome Developer Dashboard にアクセス
2. Google アカウントでサインイン
3. 開発者登録料 $5 を支払い
4. 開発者アカウント認証完了
```

### 2. 拡張機能パッケージ準備
```bash
# 本番ビルド実行
npm run build

# distディレクトリをZIP圧縮
cd dist
zip -r ../extension-v0.1.0.zip ./*
```

### 3. Store Listing 作成
```
1. 「新しいアイテム」をクリック
2. ZIPファイルをアップロード
3. アセット画像をアップロード
4. 説明文・カテゴリを設定
5. プライバシーポリシーURLを設定
```

### 4. 審査・公開
```
審査期間: 通常1-3営業日
審査基準: 
- 機能の正常動作
- プライバシーポリシー準拠
- コンテンツガイドライン遵守
- セキュリティ要件確認
```

---

## 📊 期待される成果指標

### ダウンロード目標
- **初月**: 100-500 インストール
- **3ヶ月**: 1,000-5,000 インストール
- **1年**: 10,000+ インストール

### 品質指標
- **評価**: 4.5/5.0 以上
- **レビュー**: 肯定的レビュー 90%以上
- **リテンション**: 30日後利用率 70%以上

### ユーザーエンゲージメント
- **デイリーアクティブユーザー**: 60%以上
- **機能利用率**: AI返信生成 80%以上
- **サポート問い合わせ**: 全ユーザーの5%以下

このアセット準備により、Chrome Web Storeでの成功的な拡張機能リリースを実現します。