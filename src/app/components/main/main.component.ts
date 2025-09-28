import { CommonModule } from '@angular/common';
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
import { QuillModule } from 'ngx-quill';
import { catchError, of, tap } from 'rxjs';
import { Answer } from '../../interfaces/answer.interface';
import { Chat } from '../../interfaces/chat.interface';
import { Message } from '../../interfaces/message.interface';
import { Question } from '../../interfaces/question.interface';
import { ChatbotService } from '../../services/chatbot.service';

@Component({
  selector: 'app-main',
  imports: [CommonModule, QuillModule, ReactiveFormsModule],
  providers: [ChatbotService],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
})
export class MainComponent implements OnInit {
  @ViewChild('myScrollContainer', { static: true })
  private myScrollContainer!: ElementRef;

  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);
  private service = inject(ChatbotService);
  private dr = inject(DestroyRef);

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

  clearAll() {
    localStorage.removeItem(this.service.chatContentStorageKey);
    localStorage.removeItem(this.service.chatMessagesStorageKey);
    window.location.reload();
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
    }, 500);

    this.form
      .get('html')
      ?.valueChanges.pipe(
        takeUntilDestroyed(this.dr),
        tap((data) =>
          localStorage.setItem(this.service.chatContentStorageKey, data)
        )
      )
      .subscribe();

    const chat = this.service.getChatById('1');

    if (chat) {
      this.messages.set(chat.messages);
    }

    const chatContent = localStorage.getItem(
      this.service.chatContentStorageKey
    );
    if (chatContent) {
      this.form.patchValue({ html: chatContent }, { emitEvent: false });
    }
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

        const chat: Chat = {
          chatId: '1',
          content: this.form.value.html,
          messages: this.messages(),
        };
        await this.service.upsertChat(chat);

        const ret = await this.service.getChatById('1');

        setTimeout(() => {
          this.scrollToElement();
          this.thinking.set(false);
        }, 500);

        // this.form.patchValue({ html: data.answer }, { emitEvent: false });
      });
  }
}
