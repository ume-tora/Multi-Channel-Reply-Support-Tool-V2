import fs from 'fs'
import path from 'path'

export function extensionBuildPlugin() {
  return {
    name: 'extension-build',
    writeBundle(options, bundle) {
      const outputDir = options.dir || 'dist'
      
      // background.js から export 文を削除
      const backgroundPath = path.join(outputDir, 'background.js')
      if (fs.existsSync(backgroundPath)) {
        let backgroundContent = fs.readFileSync(backgroundPath, 'utf8')
        // export 文を削除
        backgroundContent = backgroundContent.replace(/export\s*\{[\s\S]*?\};?\s*$/m, '')
        fs.writeFileSync(backgroundPath, backgroundContent)
        console.log('✓ Removed export statements from background.js')
      }
      
      // HTMLファイルを正しい場所に移動
      const srcHtmlPath = path.join(outputDir, 'src/popup/index.html')
      const targetHtmlPath = path.join(outputDir, 'popup/index.html')
      
      try {
        // popup ディレクトリを作成
        const popupDir = path.dirname(targetHtmlPath)
        if (!fs.existsSync(popupDir)) {
          fs.mkdirSync(popupDir, { recursive: true })
        }
        
        // HTMLファイルを移動
        if (fs.existsSync(srcHtmlPath)) {
          const htmlContent = fs.readFileSync(srcHtmlPath, 'utf8')
          // スクリプトとリンクのパスを修正
          let updatedHtmlContent = htmlContent
            .replace('/src/popup/main.tsx', './popup.js')
            .replace('/popup/popup.js', './popup.js')
            .replace('src="/popup/popup.js"', 'src="./popup.js"')
            .replace(/href="\/assets\//g, 'href="../assets/')
            .replace(/src="\/assets\//g, 'src="../assets/')
            // 不要なmodulepreloadリンクを削除
            .replace(/<link\s+rel="modulepreload"[^>]*>/g, '')
          fs.writeFileSync(targetHtmlPath, updatedHtmlContent)
          console.log('✓ Moved popup HTML to correct location')
          
          // 元のファイルを削除
          fs.unlinkSync(srcHtmlPath)
          
          // 空のディレクトリを削除
          const srcDir = path.dirname(srcHtmlPath)
          if (fs.existsSync(srcDir) && fs.readdirSync(srcDir).length === 0) {
            fs.rmdirSync(srcDir)
            // src ディレクトリも空なら削除
            const srcParentDir = path.dirname(srcDir)
            if (fs.existsSync(srcParentDir) && fs.readdirSync(srcParentDir).length === 0) {
              fs.rmdirSync(srcParentDir)
            }
          }
        }
      } catch (error) {
        console.warn('Warning: Could not move popup HTML file:', error.message)
      }
    }
  }
}