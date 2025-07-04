import React, { useState } from 'react';
import { Button, Modal, LoadingSpinner } from '../../components/ui';
import { useGemini } from '../../hooks/useGemini';
import type { Message as ServiceMessage } from '../services/interface';
import type { Message } from '../../types';

interface ReplyButtonProps {
  onReplyGenerated: (reply: string) => void;
  extractMessages: () => ServiceMessage[];
  className?: string;
}

export const ReplyButton: React.FC<ReplyButtonProps> = ({
  onReplyGenerated,
  extractMessages,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedReply, setGeneratedReply] = useState('');
  const { isLoading, error, generateReply, clearError } = useGemini();

  const handleGenerateReply = async () => {
    clearError();
    
    try {
      // メッセージを抽出してGemini形式に変換
      const messages = extractMessages();
      
      if (messages.length === 0) {
        alert('メッセージを取得できませんでした。ページを更新してお試しください。');
        return;
      }

      // ServiceMessage[] を Message[] に変換
      const geminiMessages: Message[] = messages.map(msg => ({
        role: 'user' as const,
        content: `${msg.author}: ${msg.text}`,
        timestamp: msg.timestamp?.getTime(),
      }));

      // 最後に返信生成の指示を追加
      geminiMessages.push({
        role: 'user' as const,
        content: '上記の会話に対して、適切で丁寧な返信を日本語で生成してください。簡潔で自然な返信をお願いします。',
      });

      const reply = await generateReply(geminiMessages);
      
      if (reply) {
        setGeneratedReply(reply);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to generate reply:', err);
    }
  };

  const handleInsertReply = () => {
    onReplyGenerated(generatedReply);
    setIsModalOpen(false);
    setGeneratedReply('');
  };

  const handleRegenerateReply = () => {
    setGeneratedReply('');
    handleGenerateReply();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setGeneratedReply('');
    clearError();
  };

  return (
    <>
      <Button
        onClick={handleGenerateReply}
        disabled={isLoading}
        loading={isLoading}
        size="sm"
        className={`${className} inline-flex items-center gap-2`}
        title="AI返信案を生成"
      >
        <span className="text-sm">🤖</span>
        <span>AI返信</span>
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="AI返信案"
        size="lg"
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">返信案を生成中...</span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  生成された返信案
                </label>
                <textarea
                  value={generatedReply}
                  onChange={(e) => setGeneratedReply(e.target.value)}
                  className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                  placeholder="返信案がここに表示されます..."
                />
              </div>

              <div className="flex justify-between gap-3">
                <Button
                  onClick={handleRegenerateReply}
                  variant="secondary"
                  disabled={isLoading}
                >
                  再生成
                </Button>

                <div className="flex gap-3">
                  <Button
                    onClick={handleCloseModal}
                    variant="secondary"
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleInsertReply}
                    disabled={!generatedReply.trim()}
                  >
                    挿入
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};