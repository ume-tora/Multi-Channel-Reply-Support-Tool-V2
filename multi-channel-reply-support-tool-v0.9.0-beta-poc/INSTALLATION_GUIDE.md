# インストール・セットアップガイド

## 🎯 このガイドについて

Multi Channel Reply Support Tool PoC/MVP のインストールから初回利用までの詳細な手順書です。

## ⚙️ システム要件

### 必須環境
- **ブラウザ**: Google Chrome 100以上（最新版推奨）
- **OS**: Windows 10/11, macOS Monterey以降, Ubuntu 20.04以降
- **インターネット接続**: Gemini API利用のため必須
- **APIキー**: Google AI Studio からのGemini APIキー

## 📥 Step 1: 事前準備

### 1.1 Google AI Studio APIキー取得
1. https://ai.google.dev/ にアクセス
2. Googleアカウントでサインイン
3. 「Get API key」→「Create API Key」でキー生成
4. 生成されたAPIキー（`AIza...`で始まる文字列）をコピー

### 1.2 Chromeデベロッパーモード有効化
1. Chrome で `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」トグルを有効化
3. 「パッケージ化されていない拡張機能を読み込む」ボタンが表示されることを確認

## 🚀 Step 2: 拡張機能インストール

### 2.1 拡張機能の読み込み
1. `chrome://extensions/` を開く
2. 「パッケージ化されていない拡張機能を読み込む」をクリック
3. 解凍したパッケージの `extension/` フォルダを選択
4. 「フォルダーの選択」をクリック

### 2.2 インストール確認
✅ 確認事項：
- 拡張機能一覧に「Multi Channel Reply Support Tool - PoC」が表示
- エラーが表示されていない
- Chromeツールバーに拡張機能アイコンが追加

## ⚙️ Step 3: 初期設定

### 3.1 APIキー設定
1. Chromeツールバーの拡張機能アイコンをクリック
2. ポップアップが開いたら「APIキー設定」欄を確認
3. 取得したAPIキーを貼り付け
4. 「保存」ボタンをクリック

### 3.2 接続テスト実行
1. 「接続テスト」ボタンをクリック
2. ✅ 成功メッセージが表示されれば設定完了
3. ❌ エラーが表示された場合は `docs/TROUBLESHOOTING_GUIDE.md` を参照

## 🧪 Step 4: 動作確認

### 4.1 Gmail での確認
1. Gmail (https://mail.google.com) を開く
2. 任意のメールスレッドを開く
3. 「🤖 AI返信」ボタンが表示されることを確認
4. ボタンをクリックして返信生成をテスト

### 4.2 その他サービスでの確認
- **Chatwork**: https://www.chatwork.com
- **Google Chat**: https://chat.google.com  
- **LINE Official Account**: https://manager.line.biz

各サービスで「🤖 AI返信」ボタンが表示され、正常に返信生成ができることを確認

## ❓ トラブルシューティング

### よくある問題

#### Q: ボタンが表示されない
**A**: 以下を順番に確認
1. ページを再読み込み（F5）
2. 拡張機能が有効化されているか確認
3. 対応URLかどうか確認
4. デベロッパーツール（F12）でエラーがないか確認

#### Q: APIエラーが出る
**A**: APIキー設定を確認
1. `AIza` で始まる正しい形式か確認
2. Google AI Studio でキーが有効か確認
3. クォータ制限に達していないか確認

#### Q: 返信生成に時間がかかる
**A**: ネットワーク環境を確認
1. インターネット接続が安定しているか
2. 企業ファイアウォールでAPIアクセスがブロックされていないか
3. VPNを使用している場合は一時的に切断してテスト

### 詳細なトラブルシューティング
より詳しい問題解決方法は `docs/TROUBLESHOOTING_GUIDE.md` を参照してください。

## 📚 次のステップ

### 機能を詳しく学ぶ
- `docs/USER_MANUAL.md`: 詳細な使用方法（77ページ）
- `docs/QUICK_START_GUIDE.md`: 5分で始める簡易ガイド

### 高度な使用方法
- ドラッグ&ドロップ操作
- 自動送信機能の安全な利用
- 複数サービス間での効率的な運用

### 品質確認・テスト
- `testing/ERROR_HANDLING_TEST_GUIDE.md`: エラーハンドリングテスト
- `testing/CROSS_BROWSER_TEST_PLAN.md`: ブラウザ互換性確認

## 📞 サポート

インストール・設定でご不明な点がありましたら：
- **FAQ**: `docs/TROUBLESHOOTING_GUIDE.md`
- **技術サポート**: GitHub Issues
- **緊急時**: 直接お問い合わせ

---

**🎉 設定完了！AI駆動の効率的な顧客対応を始めましょう！**