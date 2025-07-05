export type { ServiceStrategy, Message } from './interface';
export { GmailStrategy } from './gmail';
export { ChatworkStrategy } from './chatwork';
export { GoogleChatSimpleStrategy } from './google-chat-simple';

import type { ServiceStrategy } from './interface';
import { GmailStrategy } from './gmail';
import { ChatworkStrategy } from './chatwork';
import { GoogleChatSimpleStrategy } from './google-chat-simple';

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
      return new GmailStrategy();
    
    case 'www.chatwork.com':
    case 'chatwork.com':
      return new ChatworkStrategy();
    
    case 'chat.google.com':
      return new GoogleChatSimpleStrategy();
    
    default:
      console.warn(`Unsupported service: ${hostname}`);
      return null;
  }
}