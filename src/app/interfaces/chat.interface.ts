import { Message } from './message.interface';

export interface Chat {
  chatId: string;
  content: string;
  messages: Message[];
}
