/**
 * エラーハンドリング包括テストスクリプト
 * 本番デプロイ前の品質確認用
 * 
 * 使用方法:
 * 1. Chrome拡張機能を読み込む
 * 2. Consoleでこのスクリプトを実行
 * 3. 各エラーケースの動作を確認
 */

// =================
// API関連エラーテスト
// =================

console.log('🔍 エラーハンドリングテスト開始');

// 1. 無効なAPIキーテスト
async function testInvalidAPIKey() {
  console.log('📍 Test 1: 無効なAPIキーテスト');
  
  try {
    // 一時的にストレージの APIキーを無効なものに設定
    await chrome.storage.local.set({ 'settings.apiKey': 'invalid-api-key-test' });
    
    console.log('- 無効なAPIキーを設定しました');
    console.log('- 今からAI返信ボタンをクリックしてエラーハンドリングを確認してください');
    console.log('- 期待動作: 「APIキーが無効です」のエラーメッセージ表示');
    
    return true;
  } catch (error) {
    console.error('❌ テスト1失敗:', error);
    return false;
  }
}

// 2. ネットワークエラーシミュレーション
function testNetworkError() {
  console.log('📍 Test 2: ネットワークエラーテスト');
  console.log('- Chrome DevToolsのNetworkタブで「Offline」を選択してください');
  console.log('- その後、AI返信ボタンをクリックしてください');
  console.log('- 期待動作: 「ネットワーク接続エラー」のメッセージとリトライ機能');
}

// 3. ストレージQuota超過テスト
async function testStorageQuotaExceeded() {
  console.log('📍 Test 3: ストレージQuota超過テスト');
  
  try {
    // 大きなデータでストレージを満杯にする
    const largeString = 'a'.repeat(1024 * 1024); // 1MB
    const testData = {};
    
    for (let i = 0; i < 6; i++) {
      testData[`testLargeData${i}`] = largeString;
    }
    
    await new Promise((resolve, reject) => {
      chrome.storage.local.set(testData, () => {
        if (chrome.runtime.lastError) {
          console.log('✅ 期待通りストレージエラー:', chrome.runtime.lastError.message);
          resolve();
        } else {
          console.log('⚠️ ストレージエラーが発生しませんでした');
          resolve();
        }
      });
    });
    
    console.log('- 今からAI返信生成をして設定保存エラーハンドリングを確認してください');
    return true;
  } catch (error) {
    console.error('❌ テスト3失敗:', error);
    return false;
  }
}

// =================
// DOM関連エラーテスト  
// =================

// 4. DOM要素消失シミュレーション
function testDOMElementMissing() {
  console.log('📍 Test 4: DOM要素消失テスト');
  
  // Gmail/Chatwork等の送信ボタンを一時的に削除
  const sendButtons = document.querySelectorAll('button[type="submit"], button[data-testid*="send"], .send-button');
  const hiddenElements = [];
  
  sendButtons.forEach((btn, index) => {
    if (btn.textContent && (btn.textContent.includes('送信') || btn.textContent.includes('Send'))) {
      hiddenElements.push({element: btn, originalDisplay: btn.style.display});
      btn.style.display = 'none';
      console.log(`- 送信ボタン${index + 1}を一時的に非表示にしました`);
    }
  });
  
  console.log('- 今からAI返信の自動送信機能をテストしてください');
  console.log('- 期待動作: エラーが出ても拡張機能がクラッシュしない、適切なエラーメッセージ');
  
  // 5秒後に復元
  setTimeout(() => {
    hiddenElements.forEach(({element, originalDisplay}) => {
      element.style.display = originalDisplay;
    });
    console.log('✅ 送信ボタンを復元しました');
  }, 5000);
}

// 5. CSP (Content Security Policy) エラーテスト
function testCSPViolation() {
  console.log('📍 Test 5: CSPエラーテスト');
  
  try {
    // 意図的にCSP違反を発生させる
    const script = document.createElement('script');
    script.innerHTML = 'console.log("CSP Test");';
    document.head.appendChild(script);
    
    console.log('- CSP違反を意図的に発生させました');
    console.log('- Consoleでエラーが出力されるかチェックしてください');
    console.log('- 期待動作: 拡張機能の動作に影響しない');
  } catch (error) {
    console.log('✅ CSPエラーが適切にキャッチされました:', error.message);
  }
}

// =================
// Chrome拡張API関連テスト
// =================

// 6. Service Worker停止テスト
function testServiceWorkerStop() {
  console.log('📍 Test 6: Service Worker停止テスト');
  console.log('- chrome://extensions を開いてください');
  console.log('- 拡張機能の詳細で「Service Worker」をクリック');
  console.log('- DevToolsでService Workerを停止してください');
  console.log('- その後、ポップアップを開いて機能をテストしてください');
  console.log('- 期待動作: Service Workerの自動再起動、状態の復元');
}

// 7. 権限不足エラーテスト
async function testPermissionError() {
  console.log('📍 Test 7: 権限エラーテスト');
  
  try {
    // 存在しない権限を要求
    const permissions = await chrome.permissions.getAll();
    console.log('- 現在の権限:', permissions);
    
    // タブアクセス権限のテスト
    const hasTabPermission = permissions.permissions.includes('tabs');
    console.log('- Tabs権限:', hasTabPermission ? '有り' : '無し');
    
    if (!hasTabPermission) {
      console.log('- Tabs権限なしでの動作を確認してください');
    }
    
    return true;
  } catch (error) {
    console.log('✅ 権限エラーが適切にハンドリングされました:', error.message);
    return false;
  }
}

// =================
// 復旧機能テスト
// =================

// 8. 自動リトライ機能テスト
async function testAutoRetry() {
  console.log('📍 Test 8: 自動リトライ機能テスト');
  
  // リトライ機能のテストのため、一時的にfetchをオーバーライド
  const originalFetch = window.fetch;
  let attemptCount = 0;
  
  window.fetch = function(...args) {
    attemptCount++;
    console.log(`- API呼び出し試行 ${attemptCount}回目`);
    
    if (attemptCount < 3) {
      // 最初の2回は失敗させる
      return Promise.reject(new Error('Network error simulation'));
    } else {
      // 3回目で成功
      console.log('✅ 3回目で成功シミュレーション');
      return originalFetch.apply(this, args);
    }
  };
  
  console.log('- fetchをオーバーライドしました（3回目で成功）');
  console.log('- AI返信生成をテストしてリトライ動作を確認してください');
  
  // 10秒後に復元
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log('✅ fetchを復元しました');
  }, 10000);
}

// =================
// メインテスト実行
// =================

async function runErrorHandlingTests() {
  console.log('\n🚀 エラーハンドリング包括テスト実行中...\n');
  
  const tests = [
    { name: '無効APIキー', func: testInvalidAPIKey },
    { name: 'ネットワークエラー', func: testNetworkError },
    { name: 'ストレージQuota', func: testStorageQuotaExceeded },
    { name: 'DOM要素消失', func: testDOMElementMissing },
    { name: 'CSP違反', func: testCSPViolation },
    { name: 'Service Worker停止', func: testServiceWorkerStop },
    { name: '権限エラー', func: testPermissionError },
    { name: '自動リトライ', func: testAutoRetry }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n--- ${test.name}テスト開始 ---`);
    try {
      const result = await test.func();
      results.push({ name: test.name, result: result !== false ? 'PASS' : 'FAIL' });
      console.log(`✅ ${test.name}テスト完了\n`);
    } catch (error) {
      console.error(`❌ ${test.name}テスト失敗:`, error);
      results.push({ name: test.name, result: 'ERROR' });
    }
    
    // テスト間に1秒の間隔
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 結果サマリー
  console.log('\n📊 エラーハンドリングテスト結果サマリー');
  console.log('='.repeat(50));
  results.forEach(({name, result}) => {
    const icon = result === 'PASS' ? '✅' : result === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${name}: ${result}`);
  });
  console.log('='.repeat(50));
  
  const passCount = results.filter(r => r.result === 'PASS').length;
  const totalCount = results.length;
  console.log(`\n🎯 完了: ${passCount}/${totalCount} テスト成功`);
  
  return results;
}

// クリーンアップ関数
async function cleanupTestData() {
  console.log('\n🧹 テストデータクリーンアップ中...');
  
  try {
    // テスト用の大容量データを削除
    const keysToRemove = [];
    for (let i = 0; i < 6; i++) {
      keysToRemove.push(`testLargeData${i}`);
    }
    
    await chrome.storage.local.remove(keysToRemove);
    console.log('✅ テストデータクリーンアップ完了');
    
    // APIキーを元に戻すかユーザーに確認
    console.log('⚠️ APIキーが無効に設定されている可能性があります');
    console.log('   ポップアップの設定で正しいAPIキーを再設定してください');
    
  } catch (error) {
    console.error('❌ クリーンアップエラー:', error);
  }
}

// =================
// ユーザーインターフェース
// =================

console.log('🔧 エラーハンドリングテストスクリプトが読み込まれました');
console.log('');
console.log('利用可能なコマンド:');
console.log('- runErrorHandlingTests()  : 全テスト実行');
console.log('- testInvalidAPIKey()      : APIキーエラーテスト');
console.log('- testNetworkError()       : ネットワークエラーテスト');
console.log('- testStorageQuotaExceeded() : ストレージエラーテスト');
console.log('- testDOMElementMissing()  : DOM要素エラーテスト');
console.log('- testAutoRetry()          : リトライ機能テスト');
console.log('- cleanupTestData()        : テストデータ削除');
console.log('');
console.log('🚀 全テスト実行: runErrorHandlingTests()');