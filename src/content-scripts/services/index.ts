export type { ServiceStrategy, Message } from './interface';
export { GmailStrategy } from './gmail';
export { GmailSimpleStrategy } from './gmail-simple';
export { GmailAutoSendStrategy } from './gmail-autosend';
export { ChatworkStrategy } from './chatwork';
export { ChatworkAutoSendStrategy } from './chatwork-autosend';
export { GoogleChatSimpleStrategy } from './google-chat-simple';
export { GoogleChatAutoSendStrategy } from './google-chat-autosend';
export { LineOfficialAccountSimpleStrategy as LineOfficialAccountStrategy } from './line-official-account';
export { LineOfficialAccountAutoSendStrategy } from './line-official-account-autosend';

import type { ServiceStrategy } from './interface';
import { GmailAutoSendStrategy } from './gmail-autosend';
import { ChatworkStrategy } from './chatwork';
import { ChatworkAutoSendStrategy } from './chatwork-autosend';
import { GoogleChatSimpleStrategy } from './google-chat-simple';
import { GoogleChatAutoSendStrategy } from './google-chat-autosend';
import { LineOfficialAccountSimpleStrategy } from './line-official-account';
import { LineOfficialAccountAutoSendStrategy } from './line-official-account-autosend';

export function createServiceStrategy(url: string): ServiceStrategy | null {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  const pathname = urlObj.pathname;
  const hash = urlObj.hash;
  
  // Google ChatはGmailに統合されているため、URLとハッシュで判定
  if (hostname === 'mail.google.com' && (pathname.includes('/chat') || hash.includes('chat'))) {
    console.log('🎯 Detected Google Chat within Gmail domain - Using AutoSend Strategy');
    return new GoogleChatAutoSendStrategy();
  }
  
  switch (hostname) {
    case 'mail.google.com':
      console.log('📧 Using Gmail AutoSend Strategy');
      return new GmailAutoSendStrategy();
    
    case 'www.chatwork.com':
    case 'chatwork.com':
      console.log('🔧 Using Chatwork AutoSend Strategy');
      return new ChatworkAutoSendStrategy();
    
    case 'chat.google.com':
      console.log('🎯 Using Google Chat AutoSend Strategy');
      return new GoogleChatAutoSendStrategy();
    
    case 'manager.line.biz':
    case 'chat.line.biz':
      console.log('🟢 LINE Official Account detected (auto-send version)');
      return new LineOfficialAccountAutoSendStrategy();
    
    default:
      console.warn(`Unsupported service: ${hostname}`);
      return null;
  }
}