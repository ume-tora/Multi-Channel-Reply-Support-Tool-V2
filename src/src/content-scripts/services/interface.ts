export interface Message {
  author: string;
  text: string;
  timestamp?: Date;
}

export interface ServiceStrategy {
  /** ボタンを挿入すべきDOM要素を見つける */
  findInsertionPoint(): HTMLElement | null;

  /** 現在の会話の文脈（メッセージ履歴）を抽出する */
  extractMessages(): Message[];

  /** 指定されたテキストを入力欄に挿入する */
  insertReply(text: string): void;

  /** AI返信ボタンが既に挿入済みかチェックする */
  isButtonInjected(): boolean;

  /** サービス名を返す */
  getServiceName(): 'gmail' | 'chatwork' | 'google-chat';

  /** スレッドIDまたは会話IDを取得する（キャッシュ用） */
  getThreadId(): string | null;
}