import { Message } from './message.interface';

export interface Question {
  prompt: string;
  messages: Message[];
}
