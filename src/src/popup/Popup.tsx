import React, { lazy, Suspense } from 'react';

// Lazy load the SettingsForm to reduce initial bundle size
const SettingsForm = lazy(() => import('../components/features/SettingsForm').then(module => ({ default: module.SettingsForm })));

export const Popup: React.FC = () => {
  return (
    <div style={{
      width: '384px',
      maxHeight: '384px',
      overflowY: 'auto',
      backgroundColor: '#ffffff'
    }}>
      {/* ヘッダー */}
      <div style={{
        background: 'linear-gradient(to right, #4F46E5, #7C3AED)',
        color: 'white',
        padding: '16px 24px'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <div style={{fontSize: '24px'}}>🤖</div>
          <div>
            <h1 style={{fontSize: '18px', fontWeight: '600', margin: '0'}}>Multi Channel Reply</h1>
            <p style={{color: '#C7D2FE', fontSize: '14px', margin: '4px 0 0 0'}}>AI-Powered Reply Assistant</p>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{padding: '16px 24px'}}>
        <Suspense fallback={
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0'}}>
            <div style={{
              animation: 'spin 1s linear infinite',
              borderRadius: '50%',
              height: '24px',
              width: '24px',
              borderBottom: '2px solid #4F46E5'
            }}></div>
            <span style={{marginLeft: '8px', color: '#6B7280'}}>設定を読み込み中...</span>
          </div>
        }>
          <SettingsForm />
        </Suspense>
      </div>

      {/* フッター */}
      <div style={{
        borderTop: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB',
        padding: '12px 24px',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '12px',
          color: '#6B7280',
          margin: '0'
        }}>
          Version 0.1.0 | Made with ❤️ for productivity
        </p>
      </div>
    </div>
  );
};