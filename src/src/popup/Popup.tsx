import React, { lazy, Suspense } from 'react';

// Lazy load the SettingsForm to reduce initial bundle size
const SettingsForm = lazy(() => import('../components/features/SettingsForm').then(module => ({ default: module.SettingsForm })));

export const Popup: React.FC = () => {
  return (
    <div className="w-96 max-h-96 overflow-y-auto">
      <div className="bg-white">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h1 className="text-lg font-semibold">Multi Channel Reply</h1>
              <p className="text-blue-100 text-sm">AI-Powered Reply Assistant</p>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="p-4">
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">設定を読み込み中...</span>
            </div>
          }>
            <SettingsForm />
          </Suspense>
        </div>

        {/* フッター */}
        <div className="border-t bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500">
            Version 0.1.0 | Made with ❤️ for productivity
          </p>
        </div>
      </div>
    </div>
  );
};