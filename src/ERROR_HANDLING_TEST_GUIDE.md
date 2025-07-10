# エラーハンドリング包括テストガイド

## 概要

クライアント納品前に実施すべきエラーハンドリングテストの詳細な手順書です。
実際のユーザー環境で遭遇する可能性のあるエラーケースを網羅的にテストし、
拡張機能の堅牢性とユーザーエクスペリエンスを確保します。

## テスト環境準備

### 1. Chrome拡張機能の読み込み
```bash
# ビルド済みの拡張機能を用意
npm run build

# Chrome で chrome://extensions を開く
# 「デベロッパーモード」を有効にする
# 「パッケージ化されていない拡張機能を読み込む」で dist フォルダを選択
```

### 2. テストスクリプトの実行準備
```javascript
// 任意のWebページのConsoleで実行
// test-error-handling.js の内容をコピー&ペースト
```

## エラーケース別テスト手順

### 🔐 1. API関連エラーテスト

#### 1.1 無効なAPIキーテスト
**目的**: 認証エラー時の適切なエラーハンドリング確認

**手順**:
1. Console で `testInvalidAPIKey()` を実行
2. 拡張機能のポップアップを開く
3. AI返信ボタンをクリック

**期待動作**:
- 🔴 赤いエラー通知が表示される
- 📋 「設定を開く」「APIキー取得方法」ボタンが表示される
- ❌ 無限ローディングにならない
- 🔄 自動でリトライしない（認証エラーのため）

#### 1.2 ネットワークエラーテスト
**目的**: オフライン時の復旧機能確認

**手順**:
1. Chrome DevTools の Network タブで「Offline」を選択
2. AI返信生成を試行
3. オンラインに戻す

**期待動作**:
- ⚠️ 警告レベルの通知が表示される
- 🔄 自動でリトライが実行される
- ✅ 接続復旧時に成功通知が表示される

#### 1.3 レート制限テスト
**目的**: API使用量制限時の適切な処理確認

**テスト方法**:
```javascript
// APIレスポンスを一時的にモック
const originalFetch = window.fetch;
window.fetch = () => Promise.reject(new Error('429 Too Many Requests'));
```

**期待動作**:
- ⚠️ 「レート制限」の警告通知
- ⏰ 「30秒後に再試行」ボタンが表示される
- 🚫 即座にリトライしない

### 💾 2. ストレージ関連エラーテスト

#### 2.1 ストレージ容量超過テスト
**手順**:
1. Console で `testStorageQuotaExceeded()` を実行
2. 拡張機能の設定を変更・保存を試行

**期待動作**:
- 🔴 「ストレージ容量不足」エラー表示
- 🧹 「キャッシュクリア」ボタンが機能する
- 📖 ヘルプリンクが正しく動作する

#### 2.2 権限不足エラーテスト
**手順**:
1. `chrome://extensions` で拡張機能の権限を制限
2. ストレージ操作を試行

**期待動作**:
- 🛡️ 権限エラーが適切にキャッチされる
- 💥 拡張機能全体がクラッシュしない

### 🏗️ 3. DOM構造変更テスト

#### 3.1 送信ボタン消失テスト
**手順**:
1. Gmail/Chatwork等を開く
2. Console で `testDOMElementMissing()` を実行
3. 自動送信機能をテスト

**期待動作**:
- ⚠️ 「UI読み込みエラー」の短時間通知
- 🔄 定期的な要素検索の実行
- 📝 Console に適切なデバッグ情報
- 💥 拡張機能がクラッシュしない

#### 3.2 CSP (Content Security Policy) 違反テスト
**手順**:
1. Console で `testCSPViolation()` を実行
2. 拡張機能の動作を確認

**期待動作**:
- 🛡️ CSPエラーが適切にキャッチされる
- 🔄 拡張機能の機能に影響しない

### ⚙️ 4. Chrome拡張API関連テスト

#### 4.1 Service Worker停止テスト
**手順**:
1. `chrome://extensions` で拡張機能の詳細を開く
2. 「Service Worker」をクリックし、DevToolsで停止
3. ポップアップを開いて機能をテスト

**期待動作**:
- 🔄 Service Workerの自動再起動
- 💾 設定・状態の復元
- ⚡ 機能の正常動作継続

#### 4.2 権限要求テスト
**手順**:
1. Console で `testPermissionError()` を実行
2. 必要な権限の確認

**期待動作**:
- 📋 現在の権限状況が正確に表示される
- 🚫 権限不足による機能制限の適切な通知

### 🔄 5. 復旧機能テスト

#### 5.1 自動リトライ機能テスト
**手順**:
1. Console で `testAutoRetry()` を実行
2. AI返信生成を試行

**期待動作**:
- 🔄 最大3回のリトライ実行
- ⏰ Exponential Backoff の適切な待機時間
- ✅ 3回目で成功時の復旧通知

#### 5.2 ネットワーク復旧テスト
**手順**:
1. オフライン状態でAPI呼び出し
2. オンラインに復旧

**期待動作**:
- 🔄 自動的な接続復旧検出
- ✅ 「接続が復旧しました」の成功通知

## 通知システムテスト

### 通知レベルの確認
- 🔵 **Info**: 一般的な情報（自動で消える）
- ⚠️ **Warning**: 一時的な問題（5-8秒で消える）
- 🔴 **Error**: 対応が必要（永続表示、アクションボタン付き）
- ✅ **Success**: 成功・復旧通知（3秒で消える）

### 通知の視覚的確認事項
- 📱 レスポンシブデザイン（画面サイズ変更時）
- 🎨 適切な色分け（レベル別）
- 🔘 アクションボタンの動作
- ❌ 閉じるボタンの機能
- 📐 他のWebページUIとの干渉なし

## パフォーマンステスト

### メモリ使用量監視
```javascript
// メモリ使用量の確認
if (performance.memory) {
  console.log('Memory usage:', {
    used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
    total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB'
  });
}
```

### 低速回線でのテスト
1. Chrome DevTools > Network > "Slow 3G" を選択
2. 各機能をテスト
3. タイムアウト処理とローディング表示を確認

## クリーンアップ

### テスト完了後の清掃
```javascript
// テストデータの削除
cleanupTestData();

// 元の設定に戻す確認
// - 正しいAPIキーの再設定
// - テスト用大容量データの削除
// - fetch関数の復元
```

## 合格基準

### ✅ 必須項目
- [ ] 全エラーケースで拡張機能がクラッシュしない
- [ ] ユーザーフレンドリーなエラーメッセージ表示
- [ ] 適切な自動復旧機能
- [ ] Console エラーの最小化
- [ ] 機能への影響なし

### ✅ 品質項目
- [ ] エラー通知のUI/UX品質
- [ ] レスポンス時間（3秒以内）
- [ ] メモリ使用量の適正範囲
- [ ] 各サービスでの一貫した動作

### ✅ セキュリティ項目
- [ ] CSP違反の適切な処理
- [ ] 権限エラーの安全な処理
- [ ] 機密情報の適切な保護

## トラブルシューティング

### よくある問題と解決策

#### Console エラーが多発する場合
```javascript
// エラーログの詳細確認
console.log('Extension errors:', chrome.runtime.lastError);
```

#### 通知が表示されない場合
```javascript
// 通知コンテナの存在確認
console.log('Notification container:', document.getElementById('gemini-notifications'));
```

#### Service Worker が再起動しない場合
1. 拡張機能の再読み込み
2. Chrome の再起動
3. 権限設定の確認

## レポート作成

### テスト結果の記録
```javascript
// 全テスト実行後
runErrorHandlingTests().then(results => {
  console.log('📊 Test Summary:', results);
  
  // 結果をコピーして品質レポートに記載
  const summary = results.map(r => `${r.name}: ${r.result}`).join('\n');
  console.log('\n📋 Copy this summary:\n', summary);
});
```

### 推奨レポート形式
```
エラーハンドリングテスト結果

実行日時: [YYYY-MM-DD HH:MM]
テスト環境: Chrome [Version], OS [Type]
拡張機能バージョン: [Version]

テスト結果:
✅ 無効APIキー: PASS
✅ ネットワークエラー: PASS
✅ ストレージQuota: PASS
✅ DOM要素消失: PASS
✅ CSP違反: PASS
✅ Service Worker停止: PASS
✅ 権限エラー: PASS
✅ 自動リトライ: PASS

総合評価: [PASS/FAIL]
```

この包括的なテストを実行することで、堅牢で信頼性の高いChrome拡張機能としてクライアントに納品できます。