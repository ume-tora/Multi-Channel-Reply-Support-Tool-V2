export type { ServiceStrategy, Message } from './interface';
export { GmailStrategy } from './gmail';
export { ChatworkStrategy } from './chatwork';
export { GoogleChatStrategy } from './google-chat';

import type { ServiceStrategy } from './interface';
import { GmailStrategy } from './gmail';
import { ChatworkStrategy } from './chatwork';
import { GoogleChatStrategy } from './google-chat';

export function createServiceStrategy(url: string): ServiceStrategy | null {
  const hostname = new URL(url).hostname;
  
  switch (hostname) {
    case 'mail.google.com':
      return new GmailStrategy();
    
    case 'www.chatwork.com':
    case 'chatwork.com':
      return new ChatworkStrategy();
    
    case 'chat.google.com':
      return new GoogleChatStrategy();
    
    default:
      console.warn(`Unsupported service: ${hostname}`);
      return null;
  }
}