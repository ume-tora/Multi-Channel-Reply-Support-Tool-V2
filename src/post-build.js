#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

// ビルド後の処理
async function postBuild() {
  console.log('📦 Post-build processing...')
  
  const iconsDir = path.join(process.cwd(), 'public/icons')
  const distIconsDir = path.join(process.cwd(), 'dist/icons')
  const sizes = [16, 48, 128]
  
  try {
    // distフォルダのiconsディレクトリを確保
    if (!fs.existsSync(distIconsDir)) {
      fs.mkdirSync(distIconsDir, { recursive: true })
      console.log('📁 Created dist icons directory')
    }
    
    // SVGファイルの存在確認
    const svgPath = path.join(iconsDir, 'icon.svg')
    if (!fs.existsSync(svgPath)) {
      console.error('❌ icon.svg not found:', svgPath)
      return
    }
    
    console.log('✅ Found icon.svg, converting to PNG...')
    const svgContent = fs.readFileSync(svgPath, 'utf8')
    
    // 各サイズのPNGファイルを生成
    for (const size of sizes) {
      const pngPath = path.join(distIconsDir, `icon${size}.png`)
      
      try {
        const pngBuffer = await sharp(Buffer.from(svgContent))
          .resize(size, size)
          .png()
          .toBuffer()
        
        fs.writeFileSync(pngPath, pngBuffer)
        console.log(`✅ Created icon${size}.png`)
      } catch (error) {
        console.error(`❌ Failed to create icon${size}.png:`, error)
      }
    }
    
    console.log('🎉 Post-build completed successfully!')
  } catch (error) {
    console.error('❌ Post-build failed:', error)
  }
}

// 実行
postBuild()