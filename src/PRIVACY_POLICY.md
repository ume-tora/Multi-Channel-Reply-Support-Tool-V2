# プライバシーポリシー
# Privacy Policy

**最終更新日 / Last Updated: 2025年7月10日 / July 10, 2025**

---

## 🇯🇵 日本語版

### Multi Channel Reply Support Tool プライバシーポリシー

#### 1. 基本方針

**Multi Channel Reply Support Tool**（以下「本拡張機能」）は、ユーザーのプライバシーと個人情報の保護を最優先に考えて開発されています。本プライバシーポリシーは、本拡張機能におけるデータの取り扱いについて透明性を持って説明するものです。

**プライバシー第一の設計原則**:
- 🔒 **データの最小化**: 必要最小限のデータのみを処理
- 🏠 **ローカル処理**: 機密データの外部送信を一切行わない
- 🚫 **トラッキング禁止**: ユーザーの行動追跡を行わない
- 📖 **完全な透明性**: オープンソースによる完全な透明性

#### 2. 収集する情報

##### 2.1 自動的に収集される情報
本拡張機能は以下の情報を**自動的には収集しません**：
- ❌ 個人識別情報（名前、メールアドレス、電話番号等）
- ❌ ブラウジング履歴
- ❌ IPアドレス
- ❌ 位置情報
- ❌ デバイス識別子
- ❌ クッキーや類似の追跡技術

##### 2.2 ユーザーが提供する情報
本拡張機能は以下の情報のみを、ユーザーの明示的な同意の下で処理します：

**APIキー**:
- **目的**: Google Gemini APIとの通信のため
- **保存場所**: ブラウザのローカルストレージ（`chrome.storage.local`）
- **暗号化**: ブラウザ標準の暗号化機能により保護
- **外部送信**: APIキー自体は外部に送信されない

**会話コンテキスト**:
- **内容**: AI返信生成のための会話履歴の一部
- **処理**: Google Gemini APIに送信（一時的な処理のみ）
- **保存**: Google側での長期保存は行われない
- **匿名化**: 個人識別可能な情報は含まれない

##### 2.3 キャッシュデータ
効率的な動作のため、以下のデータを一時的にローカル保存：
- **会話コンテキスト**: 文脈理解の向上のため（TTL: 24時間）
- **設定情報**: ユーザーの設定保持のため
- **API応答**: 重複リクエスト防止のため（TTL: 1時間）

#### 3. 情報の使用目的

収集した情報は以下の目的でのみ使用されます：

##### 3.1 主要機能の提供
- **AI返信生成**: 会話の文脈に基づいた適切な返信の生成
- **設定管理**: ユーザーの設定・環境の保持
- **パフォーマンス最適化**: 応答速度の向上

##### 3.2 使用されない目的
- ❌ 商業的利用
- ❌ 第三者への販売・提供
- ❌ プロファイリングや行動分析
- ❌ 広告配信
- ❌ マーケティング目的

#### 4. 情報の共有・開示

##### 4.1 第三者への共有
本拡張機能は、以下の場合を除き、ユーザーの情報を第三者と共有しません：

**Google Gemini API**:
- **目的**: AI返信生成のための処理
- **データ**: 会話コンテキストのみ（匿名化）
- **期間**: 処理完了後即座に削除
- **規約**: Googleのプライバシーポリシーに準拠

##### 4.2 法的要請
以下の場合に限り、情報開示を行う場合があります：
- 法律、規制、法的手続きに従う必要がある場合
- 本拡張機能の利用規約に違反する行為を調査する場合
- ユーザーや公衆の安全を保護する必要がある場合

#### 5. データの保存・セキュリティ

##### 5.1 保存場所
- **ローカルストレージ**: Chrome拡張機能のローカルストレージのみ
- **サーバー保存**: 一切行わない
- **クラウド同期**: Google アカウント同期は使用しない

##### 5.2 セキュリティ対策
- **暗号化**: Chromeブラウザの標準暗号化を使用
- **アクセス制御**: 拡張機能のみがアクセス可能
- **定期削除**: TTL設定による自動データ削除
- **Manifest V3**: 最新のセキュリティ基準に準拠

##### 5.3 データ保持期間
- **APIキー**: ユーザーが削除するまで
- **設定データ**: ユーザーが削除するまで
- **キャッシュデータ**: 最大24時間（自動削除）
- **会話コンテキスト**: 最大24時間（自動削除）

#### 6. ユーザーの権利

##### 6.1 アクセス・管理権
ユーザーは以下の権利を有します：
- **閲覧権**: 保存されたデータの確認
- **修正権**: 設定・データの変更
- **削除権**: すべてのデータの完全削除
- **エクスポート権**: データのバックアップ作成

##### 6.2 データ削除方法
**完全削除手順**:
1. 拡張機能ポップアップを開く
2. 設定メニューにアクセス
3. 「すべてのデータを削除」をクリック
4. 確認ダイアログで「削除」を選択

**拡張機能削除時**:
- Chrome拡張機能をアンインストールすると、すべてのローカルデータが自動的に削除されます

#### 7. Google Gemini APIとの関係

##### 7.1 データ処理
- **API呼び出し**: 会話コンテキストをGemini APIに送信
- **応答生成**: AIによる返信テキストの生成
- **データ保持**: Googleは処理データを長期保存しない
- **プライバシー**: Googleのプライバシーポリシーが適用

##### 7.2 ユーザーの選択
- **オプトアウト**: いつでも機能の使用を停止可能
- **API制限**: ユーザー自身がAPIキーを管理
- **透明性**: すべてのAPI通信は暗号化されログも取られない

#### 8. 児童のプライバシー

本拡張機能は13歳未満の児童からの個人情報を意図的に収集しません。13歳未満の児童が個人情報を提供したことが判明した場合、速やかに削除いたします。

#### 9. 国際的なデータ転送

##### 9.1 GDPR準拠
EU一般データ保護規則（GDPR）に完全準拠：
- **合法的根拠**: ユーザーの明示的同意
- **データ主体の権利**: アクセス、修正、削除、移転の権利保護
- **データ保護責任者**: 必要に応じて指名

##### 9.2 その他の規制
- **CCPA**: カリフォルニア州消費者プライバシー法準拠
- **PIPEDA**: カナダ個人情報保護法準拠
- **個人情報保護法**: 日本の個人情報保護法準拠

#### 10. Cookieとトラッキング

本拡張機能は以下を使用しません：
- ❌ HTTP Cookie
- ❌ ウェブビーコン
- ❌ ピクセルタグ
- ❌ フィンガープリンティング
- ❌ その他のトラッキング技術

#### 11. プライバシーポリシーの変更

##### 11.1 変更通知
- プライバシーポリシーの重要な変更は事前にユーザーに通知
- 軽微な変更は本ページの更新のみ
- 変更履歴は透明性のため公開

##### 11.2 同意の更新
- 重要な変更には新たな同意を求める
- 同意しない場合は機能の使用を停止可能

#### 12. お問い合わせ

プライバシーに関するご質問やご懸念がございましたら、以下までお問い合わせください：

- **GitHub Issues**: [プロジェクトページ](https://github.com/username/multi-channel-reply-support-tool)
- **メール**: privacy@multi-channel-reply-tool.com
- **対応時間**: 48時間以内に初回返答

---

## 🇺🇸 English Version

### Multi Channel Reply Support Tool Privacy Policy

#### 1. Our Commitment to Privacy

**Multi Channel Reply Support Tool** (the "Extension") is developed with user privacy and personal data protection as our highest priority. This Privacy Policy transparently explains how we handle data in our Extension.

**Privacy-First Design Principles**:
- 🔒 **Data Minimization**: Process only the minimum necessary data
- 🏠 **Local Processing**: No external transmission of sensitive data
- 🚫 **No Tracking**: No user behavior tracking
- 📖 **Complete Transparency**: Full transparency through open source

#### 2. Information We Collect

##### 2.1 Information We Do NOT Automatically Collect
Our Extension does **NOT** automatically collect:
- ❌ Personal identifying information (names, email addresses, phone numbers, etc.)
- ❌ Browsing history
- ❌ IP addresses
- ❌ Location data
- ❌ Device identifiers
- ❌ Cookies or similar tracking technologies

##### 2.2 Information You Provide
Our Extension processes only the following information with your explicit consent:

**API Keys**:
- **Purpose**: Communication with Google Gemini API
- **Storage**: Browser local storage (`chrome.storage.local`)
- **Encryption**: Protected by browser standard encryption
- **External Transmission**: API keys themselves are not transmitted externally

**Conversation Context**:
- **Content**: Portions of conversation history for AI reply generation
- **Processing**: Sent to Google Gemini API (temporary processing only)
- **Storage**: No long-term storage by Google
- **Anonymization**: Contains no personally identifiable information

##### 2.3 Cache Data
For efficient operation, we temporarily store locally:
- **Conversation Context**: For improved context understanding (TTL: 24 hours)
- **Settings**: To maintain your preferences
- **API Responses**: To prevent duplicate requests (TTL: 1 hour)

#### 3. How We Use Information

Collected information is used solely for:

##### 3.1 Core Functionality
- **AI Reply Generation**: Generate appropriate replies based on conversation context
- **Settings Management**: Maintain user settings and environment
- **Performance Optimization**: Improve response times

##### 3.2 We Do NOT Use Data For
- ❌ Commercial exploitation
- ❌ Selling or providing to third parties
- ❌ Profiling or behavioral analysis
- ❌ Advertising
- ❌ Marketing purposes

#### 4. Information Sharing and Disclosure

##### 4.1 Third-Party Sharing
We do not share user information with third parties except in the following cases:

**Google Gemini API**:
- **Purpose**: AI reply generation processing
- **Data**: Conversation context only (anonymized)
- **Duration**: Immediately deleted after processing
- **Compliance**: Subject to Google's Privacy Policy

##### 4.2 Legal Requirements
We may disclose information only when required to:
- Comply with laws, regulations, or legal processes
- Investigate violations of our Terms of Service
- Protect the safety of users or the public

#### 5. Data Storage and Security

##### 5.1 Storage Location
- **Local Storage**: Chrome extension local storage only
- **Server Storage**: None
- **Cloud Sync**: Google Account sync not used

##### 5.2 Security Measures
- **Encryption**: Chrome browser standard encryption
- **Access Control**: Accessible only by the extension
- **Automatic Deletion**: TTL-based automatic data deletion
- **Manifest V3**: Compliant with latest security standards

##### 5.3 Data Retention Periods
- **API Keys**: Until user deletion
- **Settings Data**: Until user deletion
- **Cache Data**: Maximum 24 hours (automatic deletion)
- **Conversation Context**: Maximum 24 hours (automatic deletion)

#### 6. Your Rights

##### 6.1 Access and Management Rights
You have the following rights:
- **Access**: View stored data
- **Correction**: Modify settings and data
- **Deletion**: Complete deletion of all data
- **Export**: Create data backups

##### 6.2 Data Deletion Methods
**Complete Deletion Process**:
1. Open extension popup
2. Access settings menu
3. Click "Delete All Data"
4. Confirm in dialog

**Extension Uninstallation**:
- Uninstalling the Chrome extension automatically deletes all local data

#### 7. Google Gemini API Relationship

##### 7.1 Data Processing
- **API Calls**: Send conversation context to Gemini API
- **Response Generation**: AI-generated reply text
- **Data Retention**: Google does not retain processing data long-term
- **Privacy**: Subject to Google's Privacy Policy

##### 7.2 User Choice
- **Opt-out**: Stop using functionality at any time
- **API Control**: Users manage their own API keys
- **Transparency**: All API communications are encrypted and not logged

#### 8. Children's Privacy

We do not intentionally collect personal information from children under 13. If we become aware that a child under 13 has provided personal information, we will promptly delete it.

#### 9. International Data Transfers

##### 9.1 GDPR Compliance
Full compliance with EU General Data Protection Regulation (GDPR):
- **Legal Basis**: Explicit user consent
- **Data Subject Rights**: Protection of access, correction, deletion, and portability rights
- **Data Protection Officer**: Appointed as necessary

##### 9.2 Other Regulations
- **CCPA**: California Consumer Privacy Act compliance
- **PIPEDA**: Personal Information Protection and Electronic Documents Act compliance
- **Personal Information Protection Law**: Japan compliance

#### 10. Cookies and Tracking

Our Extension does NOT use:
- ❌ HTTP Cookies
- ❌ Web beacons
- ❌ Pixel tags
- ❌ Fingerprinting
- ❌ Other tracking technologies

#### 11. Privacy Policy Changes

##### 11.1 Change Notification
- Significant changes will be notified to users in advance
- Minor changes will only update this page
- Change history published for transparency

##### 11.2 Consent Updates
- Significant changes will require new consent
- Users can stop using functionality if they do not consent

#### 12. Contact Us

For privacy-related questions or concerns, please contact us:

- **GitHub Issues**: [Project Page](https://github.com/username/multi-channel-reply-support-tool)
- **Email**: privacy@multi-channel-reply-tool.com
- **Response Time**: Initial response within 48 hours

---

## 📜 法的注記 / Legal Notes

### 有効性 / Validity
このプライバシーポリシーは、本拡張機能のインストール時から有効となります。
This Privacy Policy becomes effective upon installation of the Extension.

### 準拠法 / Governing Law
このプライバシーポリシーは日本国法に準拠し、解釈されます。
This Privacy Policy is governed by and construed in accordance with the laws of Japan.

### 変更履歴 / Change History
- **v1.0** (2025年7月10日 / July 10, 2025): 初版公開 / Initial publication

### 証明 / Certification
このプライバシーポリシーは以下の基準に準拠しています:
This Privacy Policy complies with the following standards:
- ✅ GDPR (EU General Data Protection Regulation)
- ✅ CCPA (California Consumer Privacy Act)  
- ✅ PIPEDA (Personal Information Protection and Electronic Documents Act)
- ✅ 個人情報保護法 (Personal Information Protection Law of Japan)
- ✅ Chrome Web Store Privacy Requirements