# Multi Channel Reply Support Tool - 開発者ガイド

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![React](https://img.shields.io/badge/React-19.1-blue) ![Vite](https://img.shields.io/badge/Vite-7.0-purple)

## 📋 プロジェクト概要

**Multi Channel Reply Support Tool** は、Gmail、Chatwork、Google Chat、LINE Official Accountでの顧客対応を効率化するChrome拡張機能です。Google GeminiのAI技術を活用し、会話の文脈を理解した自然な返信を自動生成します。

### 🌟 主要機能
- **🤖 AI返信生成**: Google Gemini APIによる文脈理解型返信作成
- **🎯 マルチサービス対応**: 4つの主要プラットフォームに対応
- **⚡ ドラッグ&ドロップ**: 直感的なUIボタン操作
- **🔒 セキュリティ**: Manifest V3準拠、CSP適用済み

## 🏗️ 技術スタック

### フロントエンド
- **React** 19.1.0 - UIコンポーネント
- **TypeScript** 5.0 - 型安全性
- **Vite** 7.0.0 - 高速ビルドツール
- **Tailwind CSS** 3.x - スタイリング

### Chrome拡張機能
- **Manifest V3** - 最新拡張機能仕様
- **Service Worker** - バックグラウンド処理
- **Content Scripts** - Webページ統合

### 状態管理・API
- **Zustand** - 軽量状態管理
- **Google Gemini API** - AI返信生成
- **Chrome Storage API** - 設定・キャッシュ

## 🚀 開発環境セットアップ

### 前提条件
```bash
Node.js >= 18.0.0
npm >= 9.0.0
Google Chrome 最新版
```

### 1. リポジトリクローン
```bash
git clone <repository-url>
cd "Multi Channel Reply Support Tool"
```

### 2. 依存関係インストール
```bash
cd src
npm install
```

### 3. 環境設定
```bash
# Google AI Studio でAPIキー取得
# https://ai.google.dev/

# APIキーは拡張機能のポップアップで設定
# .envファイルは使用しません（セキュリティ上の理由）
```

### 4. 開発サーバー起動
```bash
npm run dev
```

### 5. 拡張機能インストール
1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」で `dist/` フォルダを選択

## 📁 プロジェクト構造

```
src/
├── components/             # Reactコンポーネント
│   ├── ui/                # 汎用UIコンポーネント
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── LoadingSpinner.tsx
│   └── features/          # 機能固有コンポーネント
│       └── SettingsForm.tsx
├── content-scripts/       # コンテンツスクリプト
│   ├── base/             # 基底クラス
│   ├── services/         # サービス固有実装
│   └── ui/               # UI注入機能
├── background/           # Service Worker
├── popup/               # 拡張機能ポップアップ
├── shared/              # 共通ライブラリ
│   ├── api/            # API連携
│   ├── errors/         # エラーハンドリング
│   ├── storage/        # ストレージ管理
│   ├── ui/             # UI共通機能
│   └── types/          # TypeScript型定義
├── services/           # 外部サービス連携
├── hooks/              # カスタムReactフック
├── styles/             # グローバルスタイル
└── types/              # 型定義
```

## 🛠️ 開発コマンド

### 基本コマンド
```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# プレビューサーバー起動
npm run preview

# TypeScript型チェック
npm run type-check
```

### 品質チェック
```bash
# ESLint実行
npm run lint

# ESLint自動修正
npm run lint:fix

# Prettier実行
npm run format

# 全品質チェック
npm run quality-check
```

### テスト実行
```bash
# 単体テスト
npm run test

# エラーハンドリングテスト
node test-error-handling.js

# パフォーマンステスト
node performance-test.js

# メモリリークテスト
node memory-leak-test.js
```

## 🧪 テスト戦略

### 自動テストスイート
1. **エラーハンドリングテスト**: API障害・ネットワーク問題対応
2. **パフォーマンステスト**: 応答時間・メモリ使用量監視
3. **メモリリークテスト**: 長期間使用での安定性確認
4. **XSSセキュリティテスト**: クロスサイトスクリプティング対策

### 手動テスト手順
```bash
# 1. 各サービスでの基本機能テスト
# Gmail: https://mail.google.com
# Chatwork: https://www.chatwork.com
# Google Chat: https://chat.google.com
# LINE: https://manager.line.biz

# 2. AI返信生成テスト
# 各サービスで「🤖 AI返信」ボタンクリック

# 3. ドラッグ&ドロップテスト
# ボタンを異なる位置に移動

# 4. エラーケーステスト
# 無効なAPIキー、ネットワーク切断など
```

## 🏗️ ビルド・デプロイ

### 開発ビルド
```bash
npm run build:dev
```

### プロダクションビルド
```bash
npm run build
```

### 納品パッケージ作成
```bash
# 自動パッケージ作成
node create-deliverable-package.js

# 手動パッケージ作成
# DELIVERABLE_PACKAGE_GUIDE.md を参照
```

### Chrome Web Store用ビルド
```bash
# ストア用アセット生成
node create-store-assets.js

# アセット詳細は CHROME_WEB_STORE_ASSETS.md を参照
```

## 🔧 カスタマイズ・拡張

### 新しいサービス追加

#### 1. サービス戦略作成
```typescript
// content-scripts/services/new-service.ts
export class NewServiceStrategy implements ServiceStrategy {
  getServiceName(): string {
    return 'new-service';
  }

  canInjectButton(): boolean {
    // サービス特有の判定ロジック
    return document.querySelector('.new-service-composer') !== null;
  }

  extractMessages(): ServiceMessage[] {
    // メッセージ抽出ロジック
  }

  insertReply(reply: string): void {
    // 返信挿入ロジック
  }
}
```

#### 2. コンテンツスクリプト作成
```typescript
// content-scripts/new-service.entry.ts
import { ContentScriptBase } from './base/ContentScriptBase';
import { NewServiceStrategy } from './services/new-service';

class NewServiceContentScript extends ContentScriptBase {
  protected getConfig() {
    return {
      serviceName: 'new-service',
      styleId: 'new-service-ai-styles',
      buttonId: 'new-service-ai-button',
      buttonColor: '#your-brand-color'
    };
  }

  protected createStrategy() {
    return new NewServiceStrategy();
  }
}

new NewServiceContentScript().init();
```

#### 3. Manifest.json更新
```json
{
  "content_scripts": [
    {
      "matches": ["https://newservice.com/*"],
      "js": ["content-new-service.js"],
      "run_at": "document_idle",
      "all_frames": true
    }
  ],
  "host_permissions": [
    "https://newservice.com/*"
  ]
}
```

### UIカスタマイズ

#### ボタンスタイル変更
```typescript
// shared/ui/ButtonFactory.ts で variant追加
const VARIANT_STYLES = {
  'your-service': {
    padding: '8px 16px',
    backgroundColor: '#your-color',
    borderRadius: '12px'
  }
};
```

#### CSS テーマ追加
```css
/* styles/themes/your-theme.css */
.your-service .gemini-reply-btn {
  background: linear-gradient(45deg, #color1, #color2);
  border-radius: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}
```

## 🐛 デバッグ・トラブルシューティング

### よくある問題

#### 1. ボタンが表示されない
```bash
# デバッグ手順
1. F12 → Console でエラー確認
2. chrome://extensions/ で拡張機能が有効か確認
3. ページ再読み込み (F5)
4. 対象サービスの URL 確認
```

#### 2. API エラー
```bash
# チェック項目
1. APIキーが正しく設定されているか
2. ネットワーク接続が安定しているか
3. Google AI Studio でクォータ確認
4. Chrome DevTools → Network でAPI通信確認
```

#### 3. パフォーマンス問題
```bash
# 分析方法
1. Chrome DevTools → Performance でプロファイル
2. Memory タブでメモリリーク確認
3. 自動テスト実行: node performance-test.js
```

### デバッグツール
```javascript
// Chrome DevTools Console で実行
// 拡張機能状態確認
chrome.runtime.getManifest();

// ストレージ確認
chrome.storage.local.get(null);

// パフォーマンス情報
performance.memory;
```

## 📊 品質・パフォーマンス指標

### 目標値
- **応答時間**: < 3秒 (AI返信生成)
- **メモリ使用量**: < 50MB
- **ESLint エラー**: 0件
- **TypeScript エラー**: 0件
- **テストカバレッジ**: > 80%

### 監視項目
- **Lighthouse スコア**: > 90
- **バンドルサイズ**: < 150KB (gzip)
- **CPU使用率**: < 1% (アイドル時)
- **クラッシュ率**: < 0.1%

## 🔒 セキュリティ

### セキュリティレビュー項目
```bash
# 実行コマンド
npm audit --production          # 依存関係脆弱性
node xss-vulnerability-test.js  # XSS脆弱性
node security-audit.js          # 包括的セキュリティ監査
```

### 重要なセキュリティ原則
1. **入力値サニタイゼーション**: すべてのユーザー入力を適切にエスケープ
2. **CSP強化**: Content Security Policy による制限
3. **権限最小化**: 必要最小限のChrome権限のみ使用
4. **API キー保護**: ローカルストレージでの安全な管理

## 📚 ドキュメント

### ユーザー向け
- `USER_MANUAL.md` - 詳細な使用方法 (77ページ)
- `QUICK_START_GUIDE.md` - 5分クイックスタート
- `TROUBLESHOOTING_GUIDE.md` - FAQ・問題解決 (18問題)

### 開発者向け
- `ARCHITECTURE.md` - システムアーキテクチャ
- `API_REFERENCE.md` - 内部API仕様
- `CONTRIBUTING.md` - 貢献ガイドライン

### 運用・保守
- `DEPLOYMENT_GUIDE.md` - デプロイ手順
- `MONITORING_GUIDE.md` - 監視・ログ分析
- `MAINTENANCE_GUIDE.md` - 定期メンテナンス

## 🤝 貢献・開発参加

### 開発フロー
1. Issue作成 または 既存Issue確認
2. Feature ブランチ作成: `feature/your-feature-name`
3. 開発・テスト実行
4. Pull Request 作成
5. コードレビュー
6. マージ

### コーディング規約
```typescript
// TypeScript/React 推奨パターン
interface Props {
  title: string;
  onClick: () => void;
}

const Component: React.FC<Props> = ({ title, onClick }) => {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      {title}
    </button>
  );
};
```

### コミットメッセージ規約
```bash
# 形式
type(scope): description

# 例
feat(gmail): add auto-send confirmation dialog
fix(api): handle rate limiting for Gemini API
docs(readme): update installation instructions
style(ui): improve button hover animations
refactor(storage): optimize cache management
test(e2e): add cross-browser compatibility tests
```

## 📞 サポート・お問い合わせ

### 開発者サポート
- **GitHub Issues**: バグ報告・機能要望
- **Discussions**: 技術的な質問・アイデア交換
- **Email**: development@multi-channel-reply-tool.com

### コミュニティ
- **Discord**: [コミュニティサーバー参加]
- **Twitter**: [@MultiChannelAI]
- **YouTube**: [開発解説動画]

## 📄 ライセンス

MIT License - 詳細は `LICENSE` ファイルを参照

---

**🚀 Happy Coding! AI駆動の顧客対応革新を一緒に開発しましょう！**

**📖 さらに詳しい情報は各種ドキュメントを参照してください。**