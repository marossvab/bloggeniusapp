import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Answer } from '../interfaces/answer.interface';
import { Question } from '../interfaces/question.interface';

// use the LocalStroage that stores data in the browser.
import { Chat } from '../interfaces/chat.interface';

// const db = await createRxDatabase({
//   name: 'chatdb',
//   storage: getRxStorageLocalstorage(),
// });

@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  public chatContentStorageKey = 'chatContent';
  public chatMessagesStorageKey = 'chatMessages';

  private http = inject(HttpClient);
  // private dbService = inject(DbService);

  public getChatById(id: string): Chat | null {
    const item = localStorage.getItem(this.chatMessagesStorageKey);
    if (item) {
      return JSON.parse(item) as Chat;
    }

    return null;

    // const db = await this.dbService.db;
    // const doc = await db.chat.findOne(id).exec();
    // return doc ? (JSON.parse(JSON.stringify(doc.toJSON())) as Chat) : null;
  }

  public async upsertChat(chat: Chat) {
    localStorage.setItem(this.chatMessagesStorageKey, JSON.stringify(chat));
    // const db = await this.dbService.db;
    // await db.chat.upsert({
    //   chatId: chatId,
    //   content: content,
    //   messages: messages,
    // });
  }

  public question(question: Question): Observable<Answer> {
    // question.messages.push({
    //   role: 'system',
    //   message: 'Odpoveď vlož do html tagov. Nevytváraj html stránku.',
    // });

    const url = `${environment.API}question`;
    return this.http.post<Answer>(url, question);
  }
}
