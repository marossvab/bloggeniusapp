import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Answer } from '../interfaces/answer.interface';
import { Question } from '../interfaces/question.interface';

// use the LocalStroage that stores data in the browser.
import { Guid } from 'typescript-guid';
import { Chat } from '../interfaces/chat.interface';
import { Message } from '../interfaces/message.interface';

// const db = await createRxDatabase({
//   name: 'chatdb',
//   storage: getRxStorageLocalstorage(),
// });

@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  public chatCurrentStorageKey = 'chat-current';
  public chatsStorageKey = 'chats';
  public chatContentStorageKey = 'chat-content';
  public chatMessagesStorageKey = 'chat-messages';

  private http = inject(HttpClient);

  public allChatIds = signal<string[]>([]);

  private updateChatIds(): void {
    const ids = this.getChatIds();
    this.allChatIds.set(ids);
  }

  public setCurrentChat(id: string): void {
    localStorage.setItem(this.chatCurrentStorageKey, id);
  }

  public getCurrentChat(): Chat | undefined {
    this.updateChatIds();

    const currentChatId = localStorage.getItem(this.chatCurrentStorageKey);
    if (currentChatId) {
      const chat = this.getChatById(currentChatId);
      return chat;
    }

    return undefined;
  }

  /**
   * Creates a new chat session by generating a unique identifier (GUID),
   * storing it in local storage under the configured chats storage key,
   * and returning the generated GUID.
   *
   * If there are existing chats in local storage, the new chat is appended
   * to the list; otherwise, a new list is created.
   *
   * @returns {string} The GUID of the newly created chat session.
   */
  public createChat(): Chat {
    const chats: string[] = [];
    const chatContent = '';
    const chatMessages: Message[] = [];

    const guid = Guid.create().toString();

    const chatsFromStorage = localStorage.getItem(this.chatsStorageKey);
    if (chatsFromStorage) {
      const existingChats = JSON.parse(chatsFromStorage) as string[];
      chats.push(...existingChats);
    }

    chats.push(guid);
    localStorage.setItem(this.chatsStorageKey, JSON.stringify(chats));

    localStorage.setItem(
      `${this.chatContentStorageKey}-${guid}`,
      JSON.stringify(chatContent)
    );
    localStorage.setItem(
      `${this.chatMessagesStorageKey}-${guid}`,
      JSON.stringify(chatMessages)
    );
    const chat: Chat = {
      chatId: guid,
      content: chatContent,
      messages: chatMessages,
    };

    this.updateChatIds();

    return chat;
  }

  public updateChat(chatParam: Chat): void {
    localStorage.setItem(
      `${this.chatContentStorageKey}-${chatParam.chatId}`,
      chatParam.content
    );
    localStorage.setItem(
      `${this.chatMessagesStorageKey}-${chatParam.chatId}`,
      JSON.stringify(chatParam.messages)
    );
  }

  public getChatById(id: string): Chat | undefined {
    const chatContent = localStorage.getItem(
      `${this.chatContentStorageKey}-${id}`
    );
    const chat: Chat = {
      chatId: id,
      content: chatContent || '',
      messages: [],
    };

    const chatMessages = localStorage.getItem(
      `${this.chatMessagesStorageKey}-${id}`
    );
    if (chatMessages) {
      chat.messages = JSON.parse(chatMessages) as Message[];
    }

    const chatsFromStorage = localStorage.getItem(this.chatsStorageKey);
    if (chatsFromStorage) {
      const existingChats = JSON.parse(chatsFromStorage) as string[];
      if (existingChats.find((x) => x == id)) {
        return chat;
      }
    }

    return undefined;
  }

  public deleteChat(id: string): void {
    localStorage.removeItem(`${this.chatContentStorageKey}-${id}`);
    localStorage.removeItem(`${this.chatMessagesStorageKey}-${id}`);
    const chatsFromStorage = localStorage.getItem(this.chatsStorageKey);
    if (chatsFromStorage) {
      const existingChats = JSON.parse(chatsFromStorage) as string[];
      const idx = existingChats.findIndex((x) => x == id);
      // delete existingChats[idx];
      const newArray = [
        ...existingChats.slice(0, idx),
        ...existingChats.slice(idx + 1),
      ];

      localStorage.setItem(this.chatsStorageKey, JSON.stringify(newArray));
    }

    this.updateChatIds();
  }

  public getChatIds(): string[] {
    const chatsFromStorage = localStorage.getItem(this.chatsStorageKey);
    if (chatsFromStorage) {
      const chats = JSON.parse(chatsFromStorage) as string[];
      return chats;
    }

    return [];
  }
  public deleteChats(): void {}

  // public upsertChat(chat: Chat): void {
  //   const existingChat = this.getChatById(chat.chatId);
  //   if (existingChat) {
  //     existingChat.content = chat.content;
  //     existingChat.messages = chat.messages;
  //     localStorage.setItem(this.chatsStorageKey, JSON.stringify(chats));
  //   }
  // }

  public question(question: Question): Observable<Answer> {
    // question.messages.push({
    //   role: 'system',
    //   message: 'Odpoveď vlož do html tagov. Nevytváraj html stránku.',
    // });

    const url = `${environment.API}question`;
    return this.http.post<Answer>(url, question);
  }
}
