import React, { useState, useEffect } from 'react';
import { Button, Input } from '../ui';
import { useStorage } from '../../hooks/useStorage';
import { GeminiService } from '../../services/geminiService';

export const SettingsForm: React.FC = () => {
  const { apiKey, isLoading, error, setApiKey, clearError } = useStorage();
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (apiKey) {
      setInputValue(apiKey);
    }
  }, [apiKey]);

  const handleSave = async () => {
    clearError();
    setValidationError('');
    setSaveSuccess(false);

    // バリデーション
    if (!inputValue.trim()) {
      setValidationError('APIキーを入力してください');
      return;
    }

    if (!GeminiService.validateApiKey(inputValue.trim())) {
      setValidationError('無効なAPIキー形式です。Google AI StudioでAIzaで始まるキーを取得してください');
      return;
    }

    try {
      setIsSaving(true);
      await setApiKey(inputValue.trim());
      setSaveSuccess(true);
      
      // 成功メッセージを3秒後に消す
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save API key:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (confirm('APIキーを削除しますか？この操作は元に戻せません。')) {
      try {
        setIsSaving(true);
        await setApiKey('');
        setInputValue('');
        setSaveSuccess(false);
      } catch (err) {
        console.error('Failed to clear API key:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">設定を読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Gemini API設定
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            AI返信機能を使用するには、Google AI StudioでGemini APIキーを取得してください。
          </p>
        </div>

        <Input
          label="Gemini APIキー"
          type="password"
          value={inputValue}
          onChange={setInputValue}
          placeholder="AIzaで始まるAPIキーを入力"
          error={validationError || error || undefined}
          required
        />

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            loading={isSaving}
          >
            保存
          </Button>
          
          {apiKey && (
            <Button
              onClick={handleClear}
              variant="danger"
              disabled={isSaving || isLoading}
            >
              削除
            </Button>
          )}
        </div>

        {saveSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              APIキーが保存されました
            </p>
          </div>
        )}
      </div>

      <div className="border-t pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-3">APIキーの取得方法</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>1. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a> にアクセス</p>
          <p>2. 「Create API Key」をクリック</p>
          <p>3. 生成されたAPIキー（AIzaで始まる文字列）をコピー</p>
          <p>4. 上記の入力欄にペーストして保存</p>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-3">使用方法</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Gmail、Chatwork、Google Chatの返信エリアに🤖ボタンが表示されます</p>
          <p>• ボタンをクリックすると会話の文脈に基づいた返信案が生成されます</p>
          <p>• 生成された返信案は編集してから送信できます</p>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-3">注意事項</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• APIキーはブラウザ内に安全に保存され、外部に送信されません</p>
          <p>• Gemini APIの利用には料金が発生する場合があります</p>
          <p>• 機密情報を含む会話での使用は避けてください</p>
        </div>
      </div>
    </div>
  );
};