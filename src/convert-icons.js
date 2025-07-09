import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

// SVGをPNGに変換する関数（sharpを使用）
async function svgToPng(svgContent, width, height) {
  try {
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .resize(width, height)
      .png()
      .toBuffer()
    
    return pngBuffer
  } catch (error) {
    console.error('Error converting SVG to PNG:', error)
    throw error
  }
}

async function convertIconsToPng() {
  const iconsDir = path.join(process.cwd(), 'src/public/icons')
  const distIconsDir = path.join(process.cwd(), 'dist/icons')
  const sizes = [16, 48, 128]
  
  console.log('🚀 Starting icon conversion...')
  console.log('📁 Icons directory:', iconsDir)
  console.log('📁 Dist icons directory:', distIconsDir)
  
  try {
    // distフォルダのiconsディレクトリを作成
    if (!fs.existsSync(distIconsDir)) {
      fs.mkdirSync(distIconsDir, { recursive: true })
      console.log('📁 Created dist icons directory')
    }
    
    // icon.svgを読み込み
    const svgPath = path.join(iconsDir, 'icon.svg')
    console.log('🔍 Looking for icon.svg at:', svgPath)
    
    if (!fs.existsSync(svgPath)) {
      console.error('❌ icon.svg not found at:', svgPath)
      return
    }
    
    console.log('✅ Found icon.svg')
    
    const svgContent = fs.readFileSync(svgPath, 'utf8')
    
    // 各サイズのPNGファイルを作成
    for (const size of sizes) {
      const pngPath = path.join(distIconsDir, `icon${size}.png`)
      
      console.log(`Converting icon to ${size}x${size} PNG...`)
      
      // SVGをPNGに変換
      const pngBuffer = await svgToPng(svgContent, size, size)
      
      // PNGファイルを保存
      fs.writeFileSync(pngPath, pngBuffer)
      
      console.log(`✅ Created ${pngPath}`)
    }
    
    console.log('🎉 Icon conversion completed successfully!')
  } catch (error) {
    console.error('❌ Error converting icons:', error)
  }
}

// スクリプトが直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  convertIconsToPng()
}

export { convertIconsToPng }