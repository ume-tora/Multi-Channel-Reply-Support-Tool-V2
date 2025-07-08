export type { ServiceStrategy, Message } from './interface';
export { GmailStrategy } from './gmail';
export { GmailSimpleStrategy } from './gmail-simple';
export { GmailAutoSendStrategy } from './gmail-autosend';
export { ChatworkStrategy } from './chatwork';
export { GoogleChatSimpleStrategy } from './google-chat-simple';
export { LineOfficialAccountSimpleStrategy as LineOfficialAccountStrategy } from './line-official-account';
export { LineOfficialAccountAutoSendStrategy } from './line-official-account-autosend';

import type { ServiceStrategy } from './interface';
import { GmailAutoSendStrategy } from './gmail-autosend';
import { ChatworkStrategy } from './chatwork';
import { GoogleChatSimpleStrategy } from './google-chat-simple';
import { LineOfficialAccountSimpleStrategy } from './line-official-account';

export function createServiceStrategy(url: string): ServiceStrategy | null {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  const pathname = urlObj.pathname;
  const hash = urlObj.hash;
  
  // Google ChatはGmailに統合されているため、URLとハッシュで判定
  if (hostname === 'mail.google.com' && (pathname.includes('/chat') || hash.includes('chat'))) {
    console.log('Detected Google Chat within Gmail domain');
    return new GoogleChatSimpleStrategy();
  }
  
  switch (hostname) {
    case 'mail.google.com':
      console.log('📧 Using Gmail AutoSend Strategy');
      return new GmailAutoSendStrategy();
    
    case 'www.chatwork.com':
    case 'chatwork.com':
      return new ChatworkStrategy();
    
    case 'chat.google.com':
      return new GoogleChatSimpleStrategy();
    
    case 'manager.line.biz':
    case 'chat.line.biz':
      console.log('🟢 LINE Official Account detected (auto-send version)');
      return new LineOfficialAccountAutoSendStrategy();
    
    default:
      console.warn(`Unsupported service: ${hostname}`);
      return null;
  }
}