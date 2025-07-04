// Node.jsスクリプト：アイコンPNGファイルを生成
import fs from 'fs';

// シンプルな16x16青いロボットアイコンのbase64データ
const icon16Base64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQSCxsLwcJCG1sLG0uxEFsLG0uxsLGwsLCwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLCw';

// より詳細な48x48アイコンのbase64データ  
const icon48Base64 = 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKnSURBVGiB7Zm9axRBFMafJBcSCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCw';

// 128x128高解像度アイコンのbase64データ
const icon128Base64 = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAOISURBVHic7Z29axRBFMafJBcSCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCw';

// より実用的なアプローチ：シンプルなSVGをPNGに変換するためのHTMLファイルを作成
function createIcon(size) {
    // 青いロボットアイコンのSVGを作成
    const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <!-- 背景円 -->
    <circle cx="${size/2}" cy="${size/2}" r="${size*0.4}" fill="#3B82F6"/>
    
    <!-- ロボットの頭部 -->
    <rect x="${size*0.35}" y="${size*0.3}" width="${size*0.3}" height="${size*0.25}" rx="${size*0.05}" fill="white"/>
    
    <!-- 目 -->
    <circle cx="${size*0.42}" cy="${size*0.38}" r="${size*0.03}" fill="#3B82F6"/>
    <circle cx="${size*0.58}" cy="${size*0.38}" r="${size*0.03}" fill="#3B82F6"/>
    
    <!-- 口 -->
    <rect x="${size*0.45}" y="${size*0.46}" width="${size*0.1}" height="${size*0.02}" rx="${size*0.01}" fill="#3B82F6"/>
    
    <!-- 体 -->
    <rect x="${size*0.4}" y="${size*0.58}" width="${size*0.2}" height="${size*0.25}" rx="${size*0.03}" fill="white"/>
    
    ${size >= 48 ? `
    <!-- アンテナ -->
    <line x1="${size/2}" y1="${size*0.22}" x2="${size/2}" y2="${size*0.3}" stroke="white" stroke-width="${size*0.02}" stroke-linecap="round"/>
    <circle cx="${size/2}" cy="${size*0.2}" r="${size*0.02}" fill="white"/>
    
    <!-- 腕 -->
    <rect x="${size*0.3}" y="${size*0.62}" width="${size*0.06}" height="${size*0.15}" rx="${size*0.03}" fill="white"/>
    <rect x="${size*0.64}" y="${size*0.62}" width="${size*0.06}" height="${size*0.15}" rx="${size*0.03}" fill="white"/>
    ` : ''}
</svg>`;
    
    return svg;
}

// SVGファイルを作成
for (const size of [16, 48, 128]) {
    const svg = createIcon(size);
    fs.writeFileSync(`icon${size}.svg`, svg);
    console.log(`icon${size}.svg created`);
}

// HTMLファイルでSVGをPNGに変換するためのページを作成
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>SVG to PNG Converter</title>
    <style>
        canvas { border: 1px solid #ccc; margin: 10px; }
        .icon-container { margin: 20px; }
    </style>
</head>
<body>
    <h1>Chrome Extension Icons</h1>
    <div class="icon-container">
        <h3>16x16 Icon</h3>
        <canvas id="canvas16" width="16" height="16"></canvas>
        <button onclick="downloadIcon(16)">Download PNG</button>
    </div>
    <div class="icon-container">
        <h3>48x48 Icon</h3>
        <canvas id="canvas48" width="48" height="48"></canvas>
        <button onclick="downloadIcon(48)">Download PNG</button>
    </div>
    <div class="icon-container">
        <h3>128x128 Icon</h3>
        <canvas id="canvas128" width="128" height="128"></canvas>
        <button onclick="downloadIcon(128)">Download PNG</button>
    </div>

    <script>
        function createIcon(canvas, size) {
            const ctx = canvas.getContext('2d');
            
            // 背景をクリア
            ctx.clearRect(0, 0, size, size);
            
            // 背景円
            ctx.fillStyle = '#3B82F6';
            ctx.beginPath();
            ctx.arc(size/2, size/2, size*0.4, 0, 2 * Math.PI);
            ctx.fill();
            
            // ロボットの頭部
            ctx.fillStyle = 'white';
            ctx.fillRect(size*0.35, size*0.3, size*0.3, size*0.25);
            
            // 目
            ctx.fillStyle = '#3B82F6';
            ctx.beginPath();
            ctx.arc(size*0.42, size*0.38, size*0.03, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(size*0.58, size*0.38, size*0.03, 0, 2 * Math.PI);
            ctx.fill();
            
            // 口
            ctx.fillRect(size*0.45, size*0.46, size*0.1, size*0.02);
            
            // 体
            ctx.fillStyle = 'white';
            ctx.fillRect(size*0.4, size*0.58, size*0.2, size*0.25);
            
            if (size >= 48) {
                // アンテナ
                ctx.strokeStyle = 'white';
                ctx.lineWidth = size*0.02;
                ctx.beginPath();
                ctx.moveTo(size/2, size*0.22);
                ctx.lineTo(size/2, size*0.3);
                ctx.stroke();
                
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(size/2, size*0.2, size*0.02, 0, 2 * Math.PI);
                ctx.fill();
                
                // 腕
                ctx.fillRect(size*0.3, size*0.62, size*0.06, size*0.15);
                ctx.fillRect(size*0.64, size*0.62, size*0.06, size*0.15);
            }
        }
        
        function downloadIcon(size) {
            const canvas = document.getElementById('canvas' + size);
            const link = document.createElement('a');
            link.download = 'icon' + size + '.png';
            link.href = canvas.toDataURL();
            link.click();
        }
        
        // ページ読み込み時にアイコンを描画
        window.onload = function() {
            createIcon(document.getElementById('canvas16'), 16);
            createIcon(document.getElementById('canvas48'), 48);
            createIcon(document.getElementById('canvas128'), 128);
        };
    </script>
</body>
</html>`;

fs.writeFileSync('icon-converter.html', htmlContent);
console.log('icon-converter.html created');
console.log('Open icon-converter.html in a browser and click the download buttons to generate PNG files.');