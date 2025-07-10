# パフォーマンスプロファイリングガイド

## 🎯 概要

Multi Channel Reply Support Tool のパフォーマンス測定・分析手順書です。Chrome DevToolsを使用して、拡張機能の実行効率を詳細に分析します。

## 📊 測定対象メトリクス

### 主要パフォーマンス指標
- **ポップアップ表示時間**: < 200ms 目標
- **コンテンツスクリプト注入時間**: < 100ms 目標
- **AI返信生成時間**: < 3秒 目標
- **メモリ使用量**: < 50MB 目標
- **CPU使用率**: アイドル時 < 1% 目標

## 🛠️ Step 1: 測定環境セットアップ

### 1.1 Chrome DevTools準備
```bash
# Chrome起動（パフォーマンス測定用フラグ付き）
chrome.exe --enable-benchmarking --enable-gpu-benchmarking --enable-logging
```

### 1.2 測定用拡張機能インストール
1. `chrome://extensions/` でデベロッパーモード有効化
2. `src/dist/` を「パッケージ化されていない拡張機能」として読み込み
3. 拡張機能が正常に動作することを確認

## 📈 Step 2: ポップアップ表示パフォーマンス測定

### 2.1 Performance タブでの測定
1. **DevTools 開く**: F12 → Performance タブ
2. **記録開始**: 赤い録画ボタンクリック
3. **操作実行**: 拡張機能アイコンをクリック
4. **記録停止**: ポップアップ表示後、録画停止

### 2.2 測定結果の確認項目
```javascript
// 確認すべき指標
Performance Metrics:
├── Script Parsing Time: < 50ms
├── DOM Rendering Time: < 100ms  
├── Layout Calculation: < 20ms
├── Paint Time: < 30ms
└── Total Display Time: < 200ms
```

### 2.3 最適化チェックポイント
- **バンドルサイズ**: popup.js < 50KB
- **CSS読み込み**: < 10ms
- **React Component Mount**: < 100ms
- **API Key取得**: < 5ms

## 🚀 Step 3: コンテンツスクリプト注入測定

### 3.1 各サービスでの測定手順

#### Gmail測定
```javascript
// Gmail (https://mail.google.com)
1. Performance タブで記録開始
2. ページを再読み込み (F5)
3. "🤖 AI返信" ボタンが表示されるまで待機
4. 記録停止して分析

測定指標:
- content-gmail.js読み込み時間
- DOM要素検索時間  
- ボタン注入時間
- イベントリスナー設定時間
```

#### Chatwork測定
```javascript
// Chatwork (https://www.chatwork.com)
同様の手順でcontent-chatwork.jsのパフォーマンスを測定

特記事項:
- SPA (Single Page Application) のため、
  ページ遷移時の動的注入も測定
```

#### Google Chat測定
```javascript
// Google Chat (https://chat.google.com)
同様の手順でcontent-google-chat.jsのパフォーマンスを測定

特記事項:
- Google Workspace統合のため、
  認証状態による変動も考慮
```

#### LINE Official Account測定
```javascript
// LINE Manager (https://manager.line.biz)
同様の手順でcontent-line.jsのパフォーマンスを測定

特記事項:
- 多段階認証環境での測定
- セッション維持機能の影響確認
```

## ⚡ Step 4: AI返信生成パフォーマンス測定

### 4.1 Network タブでの API 通信測定
```javascript
// 測定手順
1. DevTools → Network タブ
2. "🤖 AI返信" ボタンクリック
3. Gemini API通信を監視

測定項目:
├── Request送信時間: < 100ms
├── サーバー処理時間: < 2000ms
├── Response受信時間: < 200ms
├── JSON Parse時間: < 50ms
└── UI更新時間: < 100ms

Total: < 3000ms 目標
```

### 4.2 エラー処理パフォーマンス
```javascript
// エラーケースの測定
Test Cases:
1. 無効なAPIキー: エラー表示 < 500ms
2. ネットワーク切断: タイムアウト処理 < 5000ms  
3. レート制限: リトライ処理 < 1000ms
4. 大量テキスト: 処理時間 < 5000ms
```

## 💾 Step 5: メモリ使用量プロファイリング

### 5.1 Memory タブでの測定
```javascript
// 測定プロトコル
1. DevTools → Memory タブ
2. "Take heap snapshot" で初期状態記録
3. 拡張機能を10回使用
4. 再度スナップショット取得
5. メモリ増加量を分析

警告閾値:
- 初期メモリ: < 20MB
- 10回使用後: < 50MB  
- メモリリーク: 増加量 < 5MB
```

### 5.2 ガベージコレクション効率確認
```javascript
// GC効率チェック
Performance Timeline:
├── GC Frequency: 適切な間隔で実行
├── GC Duration: < 100ms
├── Memory Recovery: > 80%回収率
└── Retained Objects: 必要最小限
```

## 📊 Step 6: 詳細パフォーマンス分析

### 6.1 各コンポーネント別分析
```javascript
Component Performance Breakdown:

Background Script:
├── Service Worker起動: < 200ms
├── Message Handling: < 10ms
├── Storage Operation: < 50ms
└── API Communication: < 2000ms

Content Scripts:
├── DOM Ready Detection: < 50ms
├── Element Injection: < 100ms
├── Event Binding: < 20ms
└── Style Application: < 30ms

Popup:
├── React Mount: < 100ms
├── State Hydration: < 50ms
├── Form Rendering: < 50ms
└── User Interaction: < 10ms
```

### 6.2 リソース使用量監視
```javascript
Resource Monitoring:
├── CPU Usage (Idle): < 1%
├── CPU Usage (Active): < 15%
├── Network Bandwidth: < 1MB/request
├── Storage Usage: < 10MB
└── Battery Impact: Minimal
```

## ⚠️ Step 7: パフォーマンス問題の特定

### 7.1 よくあるボトルネック
```javascript
Common Performance Issues:

1. Bundle Size Issues:
   - 症状: 初期読み込み遅延
   - 原因: 大きなJavaScriptバンドル
   - 解決: Code splitting, Tree shaking

2. DOM Query Performance:
   - 症状: UI注入の遅延
   - 原因: 非効率なCSS selector
   - 解決: 最適化されたセレクター使用

3. Memory Leaks:
   - 症状: 長時間使用での動作遅延
   - 原因: Event listenerの適切な削除不足
   - 解決: Cleanup処理の強化

4. API Rate Limiting:
   - 症状: 返信生成の遅延
   - 原因: Gemini API制限
   - 解決: Request batching, Caching
```

### 7.2 最適化推奨事項
```javascript
Optimization Recommendations:

Priority 1 (High Impact):
├── Bundle size optimization (Webpack)
├── API response caching
├── DOM query optimization
└── Memory leak prevention

Priority 2 (Medium Impact):
├── Image optimization
├── CSS optimization
├── Event delegation
└── Lazy loading

Priority 3 (Low Impact):
├── Code minification
├── Gzip compression
├── Service Worker caching
└── Preload critical resources
```

## 📋 Step 8: パフォーマンステストレポート作成

### 8.1 測定結果まとめ
```markdown
## パフォーマンステスト結果

### 測定環境
- Chrome Version: [バージョン]
- OS: [オペレーティングシステム]
- Hardware: [CPU/RAM仕様]
- Network: [接続速度]

### 測定結果
| メトリクス | 目標 | 実測値 | 状態 |
|-----------|------|--------|------|
| ポップアップ表示 | < 200ms | XXXms | ✅/❌ |
| コンテンツ注入 | < 100ms | XXXms | ✅/❌ |
| AI返信生成 | < 3000ms | XXXms | ✅/❌ |
| メモリ使用量 | < 50MB | XXXmb | ✅/❌ |

### 推奨改善事項
1. [具体的な改善提案]
2. [パフォーマンス最適化案]
3. [将来的な監視計画]
```

### 8.2 継続監視計画
```javascript
Continuous Monitoring Plan:

Daily Checks:
├── Build size monitoring
├── Core Web Vitals tracking
├── Error rate monitoring
└── User feedback collection

Weekly Analysis:
├── Performance regression testing
├── Memory usage trending
├── API response time analysis
└── Browser compatibility check

Monthly Review:
├── Performance benchmark update
├── Optimization opportunity assessment
├── User experience metrics review
└── Competitive analysis
```

## 🎯 測定結果の活用

### パフォーマンス改善优先度
1. **Critical (即座対応)**: 目標の150%超過
2. **High (1週間以内)**: 目標の120-150%
3. **Medium (1ヶ月以内)**: 目標の110-120%
4. **Low (将来対応)**: 目標達成済み

### ユーザー体験への影響
- **Excellent**: すべての指標が目標達成
- **Good**: 重要指標が目標達成
- **Fair**: 一部指標で軽微な遅延
- **Poor**: 複数指標で顕著な遅延

---

**🚀 定期的なパフォーマンス測定により、最適な使用体験を維持しましょう！**