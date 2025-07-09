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
    <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
        <div style={{marginBottom: '8px'}}>
          <h2 style={{fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0', lineHeight: '1.5'}}>
            Gemini API設定
          </h2>
          <p style={{fontSize: '14px', color: '#6B7280', margin: '0', lineHeight: '1.5'}}>
            AI返信機能を使用するには、Google AI StudioでGemini APIキーを取得してください。
          </p>
        </div>

        {/* Enhanced API Key Input Section */}
        <div style={{
          backgroundColor: '#EFF6FF', 
          border: '1px solid #DBEAFE', 
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{display: 'flex', alignItems: 'center', marginBottom: '20px'}}>
            <div style={{
              width: '36px', 
              height: '36px', 
              backgroundColor: '#DBEAFE', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginRight: '16px',
              flexShrink: 0
            }}>
              <span style={{fontSize: '18px'}}>🔑</span>
            </div>
            <div style={{flex: 1}}>
              <h3 style={{fontSize: '15px', fontWeight: '600', color: '#1E3A8A', margin: '0 0 4px 0', lineHeight: '1.4'}}>APIキー設定</h3>
              <p style={{fontSize: '13px', color: '#3730A3', margin: '0', lineHeight: '1.4'}}>セキュアな接続でAI機能を有効化</p>
            </div>
          </div>
          
          <div style={{marginBottom: '20px'}}>
            <Input
              label="Gemini APIキー"
              type="password"
              value={inputValue}
              onChange={setInputValue}
              placeholder="AIzaで始まるAPIキーを入力"
              error={validationError || error || undefined}
              required
            />
          </div>

          <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
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
        </div>

        {saveSuccess && (
          <div style={{
            padding: '12px', 
            backgroundColor: '#F0FDF4', 
            border: '1px solid #BBF7D0', 
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <p style={{
              fontSize: '14px', 
              color: '#15803D', 
              display: 'flex', 
              alignItems: 'center',
              margin: '0'
            }}>
              <svg style={{width: '16px', height: '16px', marginRight: '8px'}} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              APIキーが保存されました
            </p>
          </div>
        )}
      </div>

      <div style={{borderTop: '1px solid #E5E7EB', paddingTop: '20px', marginTop: '16px', marginBottom: '20px'}}>
        <h3 style={{fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0', lineHeight: '1.5'}}>APIキーの取得方法</h3>
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#4B5563', lineHeight: '1.6'}}>
          <p style={{margin: '0', paddingLeft: '4px'}}>1. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{color: '#2563EB', textDecoration: 'underline', fontWeight: '500'}}>Google AI Studio</a> にアクセス</p>
          <p style={{margin: '0', paddingLeft: '4px'}}>2. 「Create API Key」をクリック</p>
          <p style={{margin: '0', paddingLeft: '4px'}}>3. 生成されたAPIキー（AIzaで始まる文字列）をコピー</p>
          <p style={{margin: '0', paddingLeft: '4px'}}>4. 上記の入力欄にペーストして保存</p>
        </div>
      </div>

      <div style={{borderTop: '1px solid #E5E7EB', paddingTop: '20px', marginBottom: '20px'}}>
        <h3 style={{fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0', lineHeight: '1.5'}}>使用方法</h3>
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#4B5563', lineHeight: '1.6'}}>
          <p style={{margin: '0', paddingLeft: '4px'}}>• Gmail、Chatwork、Google Chatの返信エリアに🤖ボタンが表示されます</p>
          <p style={{margin: '0', paddingLeft: '4px'}}>• ボタンをクリックすると会話の文脈に基づいた返信案が生成されます</p>
          <p style={{margin: '0', paddingLeft: '4px'}}>• 生成された返信案は編集してから送信できます</p>
        </div>
      </div>

      <div style={{borderTop: '1px solid #E5E7EB', paddingTop: '20px', paddingBottom: '0'}}>
        <h3 style={{fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0', lineHeight: '1.5'}}>注意事項</h3>
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#4B5563', lineHeight: '1.6'}}>
          <p style={{margin: '0', paddingLeft: '4px'}}>• APIキーはブラウザ内に安全に保存され、外部に送信されません</p>
          <p style={{margin: '0', paddingLeft: '4px'}}>• Gemini APIの利用には料金が発生する場合があります</p>
          <p style={{margin: '0', paddingLeft: '4px'}}>• 機密情報を含む会話での使用は避けてください</p>
        </div>
      </div>
    </div>
  );
};