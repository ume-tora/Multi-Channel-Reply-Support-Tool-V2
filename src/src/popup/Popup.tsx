import React from 'react';
import { SettingsForm } from '../components/features';

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
          <SettingsForm />
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