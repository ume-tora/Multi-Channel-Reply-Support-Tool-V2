/**
 * Chrome Web Store アセット生成スクリプト
 * SVGからPNG形式の各種サイズ画像を生成
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// アセット生成設定
const ASSETS_CONFIG = {
  // 基本アイコン（既存）
  icons: [
    { size: 16, name: 'icon16.png' },
    { size: 48, name: 'icon48.png' },
    { size: 128, name: 'icon128.png' }
  ],
  
  // Web Store専用アセット
  storeAssets: [
    { width: 440, height: 280, name: 'store-icon.png' },
    { width: 920, height: 680, name: 'promotional-tile.png' },
    { width: 1400, height: 560, name: 'marquee.png' },
    { width: 1280, height: 800, name: 'screenshot-template.png' }
  ]
};

// カラーパレット
const COLORS = {
  primary: '#4285F4',
  secondary: '#34A853', 
  accent: '#EA4335',
  warning: '#FBBC04',
  dark: '#202124',
  light: '#FFFFFF',
  gray: '#5F6368'
};

/**
 * SVGからPNGアイコンを生成（既存機能の拡張）
 */
async function generateIcons() {
  const svgPath = path.join(__dirname, 'public', 'icons', 'icon.svg');
  const outputDir = path.join(__dirname, 'dist', 'icons');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎨 Generating icons from SVG...');
  
  for (const icon of ASSETS_CONFIG.icons) {
    try {
      await sharp(svgPath)
        .resize(icon.size, icon.size)
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(path.join(outputDir, icon.name));
      
      console.log(`✅ Generated ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ Error generating ${icon.name}:`, error.message);
    }
  }
}

/**
 * Web Store用の大型アセットを生成
 */
async function generateStoreAssets() {
  const outputDir = path.join(__dirname, 'dist', 'store-assets');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🏪 Generating Chrome Web Store assets...');
  
  // Store Icon (440x280)
  await createStoreIcon(outputDir);
  
  // Promotional Tile (920x680)
  await createPromotionalTile(outputDir);
  
  // Marquee (1400x560)
  await createMarquee(outputDir);
  
  // Screenshot Template (1280x800)
  await createScreenshotTemplate(outputDir);
}

/**
 * Store Icon 作成 (440x280)
 */
async function createStoreIcon(outputDir) {
  const width = 440;
  const height = 280;
  
  const svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- グラデーション背景 -->
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${COLORS.secondary};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- 背景 -->
      <rect width="100%" height="100%" fill="url(#bgGrad)" rx="16"/>
      
      <!-- メインアイコン（中央） -->
      <circle cx="220" cy="140" r="50" fill="${COLORS.light}" filter="url(#shadow)"/>
      <text x="220" y="155" font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
            text-anchor="middle" fill="${COLORS.primary}">🤖</text>
      
      <!-- タイトル -->
      <text x="220" y="220" font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
            text-anchor="middle" fill="${COLORS.light}">Multi Channel Reply Tool</text>
      <text x="220" y="245" font-family="Arial, sans-serif" font-size="16" 
            text-anchor="middle" fill="${COLORS.light}" opacity="0.9">AI-Powered Customer Support</text>
      
      <!-- サービスアイコン -->
      <g transform="translate(50, 50)">
        <circle cx="0" cy="0" r="20" fill="${COLORS.light}" opacity="0.9"/>
        <text x="0" y="6" font-family="Arial" font-size="16" text-anchor="middle" fill="${COLORS.primary}">📧</text>
        <text x="0" y="35" font-family="Arial" font-size="10" text-anchor="middle" fill="${COLORS.light}">Gmail</text>
      </g>
      
      <g transform="translate(340, 50)">
        <circle cx="0" cy="0" r="20" fill="${COLORS.light}" opacity="0.9"/>
        <text x="0" y="6" font-family="Arial" font-size="16" text-anchor="middle" fill="${COLORS.primary}">💬</text>
        <text x="0" y="35" font-family="Arial" font-size="10" text-anchor="middle" fill="${COLORS.light}">Chatwork</text>
      </g>
      
      <g transform="translate(50, 230)">
        <circle cx="0" cy="0" r="20" fill="${COLORS.light}" opacity="0.9"/>
        <text x="0" y="6" font-family="Arial" font-size="16" text-anchor="middle" fill="${COLORS.primary}">🗨️</text>
        <text x="0" y="35" font-family="Arial" font-size="10" text-anchor="middle" fill="${COLORS.light}">G.Chat</text>
      </g>
      
      <g transform="translate(340, 230)">
        <circle cx="0" cy="0" r="20" fill="${COLORS.light}" opacity="0.9"/>
        <text x="0" y="6" font-family="Arial" font-size="16" text-anchor="middle" fill="${COLORS.primary}">📱</text>
        <text x="0" y="35" font-family="Arial" font-size="10" text-anchor="middle" fill="${COLORS.light}">LINE</text>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svgContent))
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'store-icon.png'));
  
  console.log('✅ Generated store-icon.png (440x280)');
}

/**
 * Promotional Tile 作成 (920x680)
 */
async function createPromotionalTile(outputDir) {
  const width = 920;
  const height = 680;
  
  const svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="promoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.light}" />
          <stop offset="100%" style="stop-color:#F8F9FA" />
        </linearGradient>
        <filter id="cardShadow">
          <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000" flood-opacity="0.1"/>
        </filter>
      </defs>
      
      <!-- 背景 -->
      <rect width="100%" height="100%" fill="url(#promoBg)"/>
      
      <!-- メインカード -->
      <rect x="60" y="60" width="800" height="560" fill="${COLORS.light}" rx="24" filter="url(#cardShadow)"/>
      
      <!-- ヘッダー -->
      <rect x="60" y="60" width="800" height="120" fill="${COLORS.primary}" rx="24"/>
      <rect x="60" y="156" width="800" height="24" fill="${COLORS.primary}"/>
      
      <!-- タイトル -->
      <text x="460" y="110" font-family="Arial, sans-serif" font-size="36" font-weight="bold" 
            text-anchor="middle" fill="${COLORS.light}">Multi Channel Reply Support Tool</text>
      <text x="460" y="140" font-family="Arial, sans-serif" font-size="18" 
            text-anchor="middle" fill="${COLORS.light}" opacity="0.9">AI-Powered Customer Support Assistant</text>
      
      <!-- 機能セクション -->
      <g transform="translate(120, 220)">
        <!-- AI返信生成 -->
        <circle cx="40" cy="40" r="30" fill="${COLORS.secondary}" opacity="0.1"/>
        <text x="40" y="50" font-family="Arial" font-size="24" text-anchor="middle">🤖</text>
        <text x="100" y="35" font-family="Arial" font-size="20" font-weight="bold" fill="${COLORS.dark}">AI返信生成</text>
        <text x="100" y="55" font-family="Arial" font-size="14" fill="${COLORS.gray}">3秒で高品質な返信を自動生成</text>
        
        <!-- ドラッグ&ドロップ -->
        <circle cx="40" cy="120" r="30" fill="${COLORS.accent}" opacity="0.1"/>
        <text x="40" y="130" font-family="Arial" font-size="24" text-anchor="middle">🎯</text>
        <text x="100" y="115" font-family="Arial" font-size="20" font-weight="bold" fill="${COLORS.dark}">ドラッグ&ドロップ</text>
        <text x="100" y="135" font-family="Arial" font-size="14" fill="${COLORS.gray}">直感的な操作で時間短縮</text>
        
        <!-- 自動送信 -->
        <circle cx="40" cy="200" r="30" fill="${COLORS.warning}" opacity="0.1"/>
        <text x="40" y="210" font-family="Arial" font-size="24" text-anchor="middle">⚡</text>
        <text x="100" y="195" font-family="Arial" font-size="20" font-weight="bold" fill="${COLORS.dark}">安全な自動送信</text>
        <text x="100" y="215" font-family="Arial" font-size="14" fill="${COLORS.gray}">確認ダイアログで誤送信防止</text>
      </g>
      
      <!-- 対応サービス -->
      <g transform="translate(500, 220)">
        <text x="0" y="20" font-family="Arial" font-size="20" font-weight="bold" fill="${COLORS.dark}">対応サービス</text>
        
        <g transform="translate(0, 40)">
          <rect x="0" y="0" width="120" height="40" fill="${COLORS.primary}" opacity="0.1" rx="8"/>
          <text x="10" y="15" font-family="Arial" font-size="16" fill="${COLORS.primary}">📧</text>
          <text x="35" y="25" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.dark}">Gmail</text>
        </g>
        
        <g transform="translate(140, 40)">
          <rect x="0" y="0" width="120" height="40" fill="${COLORS.secondary}" opacity="0.1" rx="8"/>
          <text x="10" y="15" font-family="Arial" font-size="16" fill="${COLORS.secondary}">💬</text>
          <text x="35" y="25" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.dark}">Chatwork</text>
        </g>
        
        <g transform="translate(0, 100)">
          <rect x="0" y="0" width="120" height="40" fill="${COLORS.accent}" opacity="0.1" rx="8"/>
          <text x="10" y="15" font-family="Arial" font-size="16" fill="${COLORS.accent}">🗨️</text>
          <text x="35" y="25" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.dark}">Google Chat</text>
        </g>
        
        <g transform="translate(140, 100)">
          <rect x="0" y="0" width="120" height="40" fill="${COLORS.warning}" opacity="0.1" rx="8"/>
          <text x="10" y="15" font-family="Arial" font-size="16" fill="${COLORS.warning}">📱</text>
          <text x="35" y="25" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.dark}">LINE Official</text>
        </g>
        
        <!-- 統計情報 -->
        <text x="0" y="180" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.dark}">導入効果</text>
        <text x="0" y="200" font-family="Arial" font-size="14" fill="${COLORS.gray}">返信時間 80%短縮</text>
        <text x="0" y="220" font-family="Arial" font-size="14" fill="${COLORS.gray}">顧客満足度向上</text>
      </g>
      
      <!-- CTA -->
      <rect x="320" y="580" width="280" height="50" fill="${COLORS.primary}" rx="25"/>
      <text x="460" y="610" font-family="Arial" font-size="18" font-weight="bold" 
            text-anchor="middle" fill="${COLORS.light}">Chrome Web Storeで無料ダウンロード</text>
    </svg>
  `;

  await sharp(Buffer.from(svgContent))
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'promotional-tile.png'));
  
  console.log('✅ Generated promotional-tile.png (920x680)');
}

/**
 * Marquee 作成 (1400x560)
 */
async function createMarquee(outputDir) {
  const width = 1400;
  const height = 560;
  
  const svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="marqueeBg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${COLORS.primary}" />
          <stop offset="100%" style="stop-color:${COLORS.secondary}" />
        </linearGradient>
      </defs>
      
      <!-- 背景 -->
      <rect width="100%" height="100%" fill="url(#marqueeBg)"/>
      
      <!-- 左側: 機能デモエリア -->
      <rect x="80" y="80" width="600" height="400" fill="${COLORS.light}" rx="16" opacity="0.95"/>
      
      <!-- デモ画面のモック -->
      <rect x="100" y="100" width="560" height="40" fill="${COLORS.primary}" rx="8"/>
      <text x="120" y="125" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.light}">Gmail - AI返信生成デモ</text>
      
      <!-- メール画面モック -->
      <rect x="120" y="160" width="520" height="60" fill="#F8F9FA" rx="8"/>
      <text x="140" y="180" font-family="Arial" font-size="12" fill="${COLORS.gray}">件名: プロジェクトについてのお問い合わせ</text>
      <text x="140" y="200" font-family="Arial" font-size="11" fill="${COLORS.gray}">お世話になっております。来週のプロジェクト会議について...</text>
      
      <!-- AI返信ボタン -->
      <rect x="120" y="240" width="120" height="35" fill="${COLORS.secondary}" rx="6"/>
      <text x="180" y="262" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="${COLORS.light}">🤖 AI返信</text>
      
      <!-- 生成された返信 -->
      <rect x="120" y="290" width="520" height="80" fill="#E8F5E8" rx="8"/>
      <text x="140" y="310" font-family="Arial" font-size="12" font-weight="bold" fill="${COLORS.dark}">生成された返信:</text>
      <text x="140" y="330" font-family="Arial" font-size="11" fill="${COLORS.gray}">ご連絡ありがとうございます。来週のプロジェクト会議の件、</text>
      <text x="140" y="345" font-family="Arial" font-size="11" fill="${COLORS.gray}">承知いたしました。資料準備の方、進めさせていただきます。</text>
      <text x="140" y="360" font-family="Arial" font-size="11" fill="${COLORS.gray}">何かご不明な点がございましたら、お気軽にお声がけください。</text>
      
      <!-- 右側: 機能紹介 -->
      <g transform="translate(720, 80)">
        <!-- メインタイトル -->
        <text x="0" y="40" font-family="Arial" font-size="42" font-weight="bold" fill="${COLORS.light}">AI-Powered</text>
        <text x="0" y="80" font-family="Arial" font-size="42" font-weight="bold" fill="${COLORS.light}">Customer Support</text>
        <text x="0" y="120" font-family="Arial" font-size="20" fill="${COLORS.light}" opacity="0.9">マルチチャンネル対応の次世代返信ツール</text>
        
        <!-- 主要ベネフィット -->
        <g transform="translate(0, 160)">
          <circle cx="20" cy="20" r="12" fill="${COLORS.light}" opacity="0.2"/>
          <text x="20" y="26" font-family="Arial" font-size="14" text-anchor="middle" fill="${COLORS.light}">⚡</text>
          <text x="50" y="15" font-family="Arial" font-size="18" font-weight="bold" fill="${COLORS.light}">3秒で高品質返信</text>
          <text x="50" y="30" font-family="Arial" font-size="14" fill="${COLORS.light}" opacity="0.8">Gemini AIによる瞬時の返信生成</text>
        </g>
        
        <g transform="translate(0, 220)">
          <circle cx="20" cy="20" r="12" fill="${COLORS.light}" opacity="0.2"/>
          <text x="20" y="26" font-family="Arial" font-size="14" text-anchor="middle" fill="${COLORS.light}">🌐</text>
          <text x="50" y="15" font-family="Arial" font-size="18" font-weight="bold" fill="${COLORS.light}">4つの主要サービス対応</text>
          <text x="50" y="30" font-family="Arial" font-size="14" fill="${COLORS.light}" opacity="0.8">Gmail, Chatwork, Google Chat, LINE</text>
        </g>
        
        <g transform="translate(0, 280)">
          <circle cx="20" cy="20" r="12" fill="${COLORS.light}" opacity="0.2"/>
          <text x="20" y="26" font-family="Arial" font-size="14" text-anchor="middle" fill="${COLORS.light}">🔒</text>
          <text x="50" y="15" font-family="Arial" font-size="18" font-weight="bold" fill="${COLORS.light}">安全なローカル処理</text>
          <text x="50" y="30" font-family="Arial" font-size="14" fill="${COLORS.light}" opacity="0.8">プライバシー重視の設計</text>
        </g>
        
        <!-- CTA -->
        <rect x="0" y="340" width="300" height="60" fill="${COLORS.light}" rx="30"/>
        <text x="150" y="375" font-family="Arial" font-size="20" font-weight="bold" text-anchor="middle" fill="${COLORS.primary}">今すぐ無料で始める</text>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svgContent))
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'marquee.png'));
  
  console.log('✅ Generated marquee.png (1400x560)');
}

/**
 * スクリーンショットテンプレート作成 (1280x800)
 */
async function createScreenshotTemplate(outputDir) {
  const width = 1280;
  const height = 800;
  
  const svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="templateShadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.1"/>
        </filter>
      </defs>
      
      <!-- 背景 -->
      <rect width="100%" height="100%" fill="#F8F9FA"/>
      
      <!-- ブラウザ枠 -->
      <rect x="40" y="60" width="1200" height="680" fill="${COLORS.light}" rx="12" filter="url(#templateShadow)"/>
      
      <!-- ブラウザヘッダー -->
      <rect x="40" y="60" width="1200" height="40" fill="#E8EAED" rx="12"/>
      <rect x="40" y="88" width="1200" height="12" fill="#E8EAED"/>
      
      <!-- アドレスバー -->
      <rect x="80" y="70" width="800" height="20" fill="${COLORS.light}" rx="10"/>
      <text x="90" y="83" font-family="Arial" font-size="12" fill="${COLORS.gray}">https://mail.google.com/mail/u/0/#inbox</text>
      
      <!-- 閉じる・最小化ボタン -->
      <circle cx="60" cy="80" r="6" fill="#FF5F57"/>
      <circle cx="80" cy="80" r="6" fill="#FFBD2E"/>
      <circle cx="100" cy="80" r="6" fill="#28CA42"/>
      
      <!-- メインコンテンツエリア（スクリーンショット配置用） -->
      <rect x="60" y="120" width="1160" height="600" fill="#FFFFFF" rx="8"/>
      
      <!-- テンプレート表示用テキスト -->
      <text x="640" y="400" font-family="Arial" font-size="24" text-anchor="middle" fill="${COLORS.gray}" opacity="0.3">スクリーンショット配置エリア</text>
      <text x="640" y="430" font-family="Arial" font-size="16" text-anchor="middle" fill="${COLORS.gray}" opacity="0.3">1160 x 600 px</text>
      
      <!-- 注釈エリア用のテンプレート -->
      <rect x="880" y="140" width="340" height="200" fill="${COLORS.primary}" opacity="0.1" rx="12" stroke="${COLORS.primary}" stroke-width="2" stroke-dasharray="8,4"/>
      <text x="1050" y="180" font-family="Arial" font-size="14" text-anchor="middle" fill="${COLORS.primary}">注釈エリア</text>
      <text x="1050" y="200" font-family="Arial" font-size="12" text-anchor="middle" fill="${COLORS.gray}">機能説明やハイライト</text>
      <text x="1050" y="220" font-family="Arial" font-size="12" text-anchor="middle" fill="${COLORS.gray}">矢印・番号などを配置</text>
    </svg>
  `;

  await sharp(Buffer.from(svgContent))
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'screenshot-template.png'));
  
  console.log('✅ Generated screenshot-template.png (1280x800)');
}

/**
 * 使用方法情報表示
 */
function showUsageInfo() {
  console.log(`
📦 Chrome Web Store Assets Generator

使用方法:
  node create-store-assets.js

生成されるファイル:
  📁 dist/icons/
    ├── icon16.png (16x16)
    ├── icon48.png (48x48)
    └── icon128.png (128x128)
  
  📁 dist/store-assets/
    ├── store-icon.png (440x280)
    ├── promotional-tile.png (920x680)
    ├── marquee.png (1400x560)
    └── screenshot-template.png (1280x800)

注意事項:
  • 実際のスクリーンショットは手動で撮影が必要
  • テンプレートを参考に注釈・ハイライトを追加
  • 最終的な画像最適化を推奨 (TinyPNG等)
  `);
}

/**
 * メイン実行関数
 */
async function main() {
  try {
    console.log('🚀 Starting Chrome Web Store assets generation...\n');
    
    // Sharp がインストールされているかチェック
    try {
      require('sharp');
    } catch (error) {
      console.error('❌ Error: sharp package is required');
      console.log('💡 Install with: npm install sharp');
      process.exit(1);
    }
    
    await generateIcons();
    console.log('');
    await generateStoreAssets();
    
    console.log('\n🎉 All assets generated successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. 実際のアプリケーション使用中のスクリーンショットを撮影');
    console.log('2. VISUAL_GUIDE.md に従って画像編集・注釈追加');
    console.log('3. TinyPNG等で最終的な画像最適化');
    console.log('4. Chrome Developer Dashboard でアップロード');
    
  } catch (error) {
    console.error('❌ Asset generation failed:', error.message);
    process.exit(1);
  }
}

// コマンドライン引数確認
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsageInfo();
} else {
  main();
}

module.exports = {
  generateIcons,
  generateStoreAssets,
  ASSETS_CONFIG,
  COLORS
};