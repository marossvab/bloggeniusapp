import { NgClass } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import {
  HtmlEditorService,
  ImageService,
  LinkService,
  RichTextEditorAllModule,
  ToolbarService,
} from '@syncfusion/ej2-angular-richtexteditor';
import { catchError, of, tap } from 'rxjs';
import { Answer } from '../../interfaces/answer.interface';
import { Chat } from '../../interfaces/chat.interface';
import { Message } from '../../interfaces/message.interface';
import { Question } from '../../interfaces/question.interface';
import { ChatbotService } from '../../services/chat.service';

@Component({
  selector: 'app-main',
  imports: [NgClass, ReactiveFormsModule, RichTextEditorAllModule],
  providers: [
    ChatbotService,
    ToolbarService,
    LinkService,
    ImageService,
    HtmlEditorService,
  ],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
})
export class MainComponent implements OnInit {
  @ViewChild('myScrollContainer', { static: true })
  private myScrollContainer!: ElementRef;

  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);
  public service = inject(ChatbotService);
  private dr = inject(DestroyRef);

  currentChat = signal<Chat | null>(null);
  answer = signal<Answer | null>(null);
  messages = signal<Message[]>([]);

  thinking = signal<boolean>(false);

  form: FormGroup = this.fb.group({
    html: new FormControl(''),
  });
  promptForm: FormGroup = this.fb.group({
    prompt: new FormControl(''),
  });

  modules = {
    formula: false,
    syntax: false,
  };

  quillConfiguration = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ color: [] }, { background: [] }],
      ['link'],
      ['clean'],
    ],
  };

  changeChat(idx: number) {
    const chats = this.service.getChatIds();
    const id = chats[idx];
    const chat = this.service.getChatById(id);
    if (chat) {
      this.setCurrentChat(chat);
      setTimeout(() => {
        this.scrollToElement();
      }, 100);
    }
  }

  clearAll() {
    this.service.deleteChats();
    window.location.reload();
  }

  setCurrentChat(chat: Chat) {
    this.currentChat.set(chat);
    this.messages.set(chat.messages);
    this.form.patchValue({ html: chat.content }, { emitEvent: false });
    this.service.setCurrentChat(chat.chatId);
  }

  newChat(): void {
    const chat = this.service.createChat();
    if (chat) {
      this.setCurrentChat(chat);
    }
  }

  removeChat(): void {
    const chat = this.currentChat();
    if (chat) {
      this.service.deleteChat(chat.chatId);
      const chats = this.service.getChatIds();

      if (chats.length == 0) {
        this.newChat();
      } else {
        const first = chats.find((_, index) => !index);

        const newChat = this.service.getChatById(chats[0]);

        if (newChat) {
          this.setCurrentChat(newChat);
        }
      }
    }
  }

  scrollToElement(): void {
    this.myScrollContainer?.nativeElement.scroll({
      top: this.myScrollContainer.nativeElement.scrollHeight,
      left: 0,
      behavior: 'smooth',
    });
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.scrollToElement();
      this.thinking.set(false);
    }, 100);

    this.form
      .get('html')
      ?.valueChanges.pipe(
        takeUntilDestroyed(this.dr),
        tap((data) => {
          // localStorage.setItem(this.service.chatContentStorageKey, data)
          const chat = this.service.getCurrentChat();
          if (chat) {
            chat.content = data;
            this.service.updateChat(chat);
          }
        })
      )
      .subscribe();

    const chat = this.service.getCurrentChat();
    if (chat) {
      this.currentChat.set(chat);
      this.messages.set(chat.messages);
      this.form.patchValue({ html: chat.content }, { emitEvent: false });
    } else {
      this.newChat();
    }

    // const chat = this.service.getChatById('1');

    // if (chat) {
    //   this.messages.set(chat.messages);
    // }

    // const chatContent = localStorage.getItem(
    //   this.service.chatContentStorageKey
    // );
    // if (chatContent) {
    //   this.form.patchValue({ html: chatContent }, { emitEvent: false });
    // }
  }

  isHTML(text: string): boolean {
    try {
      const fragment = new DOMParser().parseFromString(text, 'text/html');
      const ret = fragment.body.children.length > 0;

      return ret;
    } catch (error) {}
    return false;
  }

  byPassHTML(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  async onSubmit(): Promise<void> {
    this.thinking.set(true);
    const prompt = this.promptForm.value.prompt;
    this.promptForm.patchValue({ prompt: null }, { emitEvent: false });

    const messages: Question = {
      prompt: prompt,
      messages: this.messages(),
    };

    this.service
      .question(messages)
      .pipe(
        catchError((err) => {
          this.thinking.set(false);
          return of();
        })
      )
      .subscribe(async (data) => {
        this.answer.set(data);

        var lastMessage = data.messages[data.messages.length - 1];

        const msg: Message = {
          role: 'user',
          message: prompt,
        };
        this.messages.update((values) => {
          return [...values, msg];
        });
        this.messages.update((values) => {
          return [...values, lastMessage];
        });

        // const chat: Chat = {
        //   chatId: '1',
        //   content: this.form.value.html,
        //   messages: this.messages(),
        // };
        // await this.service.upsertChat(chat);
        // const ret = await this.service.getChatById('1');
        const chat = this.service.getCurrentChat();
        if (chat) {
          chat.content = this.form.value.html;
          chat.messages = this.messages();
          this.service.updateChat(chat);
          // this.currentChat.set(chat );
          // this.messages.set(chat.messages);
          // this.form.patchValue({ html: chat.content }, { emitEvent: false });
        }

        setTimeout(() => {
          this.scrollToElement();
          this.thinking.set(false);
        }, 100);

        // this.form.patchValue({ html: data.answer }, { emitEvent: false });
      });
  }
}
