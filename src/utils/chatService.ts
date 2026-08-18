import type { ChatMessage } from '../types';

const CHAT_KEY = 'exam-helper-chat';

type ChatStore = Record<string, ChatMessage[]>;

const loadStore = (): ChatStore => {
  const data = localStorage.getItem(CHAT_KEY);
  return data ? (JSON.parse(data) as ChatStore) : {};
};

const saveStore = (store: ChatStore): void => {
  localStorage.setItem(CHAT_KEY, JSON.stringify(store));
};

export const loadChat = (courseId: string): ChatMessage[] => {
  return loadStore()[courseId] || [];
};

export const saveChat = (courseId: string, messages: ChatMessage[]): void => {
  const store = loadStore();
  store[courseId] = messages;
  saveStore(store);
};

export const clearChat = (courseId: string): void => {
  const store = loadStore();
  delete store[courseId];
  saveStore(store);
};
