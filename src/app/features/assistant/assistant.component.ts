import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ListboxModule } from 'primeng/listbox';
import { DialogModule } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ConversationService, ConversationDto, MessageDto } from '../../core/services/conversation.service';
import { ProcessJobStatusDto } from '../../core/services/document.service';

interface UiMessage extends MessageDto {
  streaming?: boolean;
  isError?: boolean;
}

type AttachMode = 'existing' | 'upload';

interface AttachFileOption {
  label: string;
  value: string;
  meta: string;
}

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TextareaModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    ListboxModule,
    DialogModule,
    SelectButtonModule,
    SelectModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.scss'
})
export class AssistantComponent implements OnInit, OnDestroy {
  private conversationService = inject(ConversationService);
  private confirmationService = inject(ConfirmationService);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  conversations: ConversationDto[] = [];
  selectedConversation: ConversationDto | null = null;
  conversationsLoading = true;

  messages: UiMessage[] = [];
  loadingMessages = false;

  question = '';
  sending = false;
  errorMessage: string | null = null;

  attachModeOptions: { label: string; value: AttachMode }[] = [
    { label: 'Rapport existant', value: 'existing' },
    { label: 'Nouveau rapport', value: 'upload' }
  ];

  attachDialogVisible = false;
  attachMode: AttachMode = 'existing';

  // Option A — choisir un rapport déjà ingéré
  attachSelectedFile: string | null = null;
  attachFileOptions: AttachFileOption[] = [];
  attachLoading = false;

  // Option B — uploader un nouveau rapport
  attachUploadFile: File | null = null;
  attachUploading = false;
  attachUploadStatus: ProcessJobStatusDto | null = null;
  attachUploadError: string | null = null;
  private uploadPollHandle: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.conversationService.getConversations().subscribe({
      next: (list) => {
        this.conversations = list;
        this.conversationsLoading = false;
        if (list.length) {
          this.selectConversation(list[0]);
        }
      },
      error: () => {
        this.conversationsLoading = false;
        this.errorMessage = 'Impossible de charger les discussions.';
      }
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  async newConversation() {
    try {
      const conv = await firstValueFrom(this.conversationService.createConversation());
      this.conversations.unshift(conv);
      this.selectedConversation = conv;
      this.messages = [];
    } catch {
      this.errorMessage = 'Impossible de créer une nouvelle discussion.';
    }
  }

  selectConversation(conv: ConversationDto) {
    if (this.selectedConversation?.id === conv.id) return;

    this.selectedConversation = conv;
    this.messages = [];
    this.loadingMessages = true;

    this.conversationService.getMessages(conv.id).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.loadingMessages = false;
        this.scrollToBottom();
      },
      error: () => {
        this.loadingMessages = false;
        this.errorMessage = 'Impossible de charger les messages de cette discussion.';
      }
    });
  }

  confirmDelete(conv: ConversationDto, event: Event) {
    event.stopPropagation();
    this.confirmationService.confirm({
      message: `Supprimer définitivement la discussion "${conv.title}" ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteConversation(conv)
    });
  }

  private deleteConversation(conv: ConversationDto) {
    this.conversationService.deleteConversation(conv.id).subscribe({
      next: () => {
        this.conversations = this.conversations.filter((c) => c.id !== conv.id);
        if (this.selectedConversation?.id === conv.id) {
          this.selectedConversation = null;
          this.messages = [];
          if (this.conversations.length) {
            this.selectConversation(this.conversations[0]);
          }
        }
      },
      error: () => {
        this.errorMessage = 'Impossible de supprimer cette discussion.';
      }
    });
  }

  async sendMessage() {
    const content = this.question.trim();
    if (!content || this.sending) return;

    this.question = '';
    this.errorMessage = null;

    if (!this.selectedConversation) {
      await this.newConversation();
      if (!this.selectedConversation) return;
    }
    const conversation = this.selectedConversation;

    const userMessage: UiMessage = {
      id: Date.now(),
      role: 'USER',
      content,
      createdAt: new Date().toISOString()
    };
    const assistantMessage: UiMessage = {
      id: Date.now() + 1,
      role: 'ASSISTANT',
      content: '',
      createdAt: new Date().toISOString(),
      streaming: true
    };
    this.messages.push(userMessage, assistantMessage);
    this.scrollToBottom();

    this.sending = true;

    try {
      await this.conversationService.streamMessage(conversation.id, content, (token) => {
        assistantMessage.content += token;
        this.scrollToBottom();
      });
    } catch {
      if (!assistantMessage.content) {
        assistantMessage.content = '[Erreur] La génération de la réponse a échoué.';
      }
    } finally {
      assistantMessage.streaming = false;
      assistantMessage.isError = assistantMessage.content.startsWith('[Erreur]');
      this.sending = false;
      this.refreshConversations();
    }
  }

  private refreshConversations() {
    this.conversationService.getConversations().subscribe({
      next: (list) => {
        this.conversations = list;
        if (this.selectedConversation) {
          const updated = list.find((c) => c.id === this.selectedConversation!.id);
          if (updated) this.selectedConversation = updated;
        }
      }
    });
  }

  openAttachDialog() {
    if (!this.selectedConversation) return;
    this.attachMode = 'existing';
    this.attachSelectedFile = null;
    this.attachUploadFile = null;
    this.attachUploadStatus = null;
    this.attachUploadError = null;
    this.attachDialogVisible = true;
    this.loadAvailableReports();
  }

  onAttachModeChange() {
    this.attachUploadFile = null;
    this.attachUploadStatus = null;
    this.attachUploadError = null;
  }

  private loadAvailableReports() {
    this.attachLoading = true;
    this.conversationService.getAvailableReports(0, 50).subscribe({
      next: (res) => {
        this.attachFileOptions = res.content
          .filter((item) => item.success)
          .map((item) => ({
            label: item.filename,
            value: item.filename,
            meta: `${new Date(item.createdAt).toLocaleDateString('fr-FR')} · ${item.chunkCount} chunks`
          }));
        this.attachLoading = false;
      },
      error: () => {
        this.attachLoading = false;
      }
    });
  }

  confirmAttachExisting() {
    if (!this.selectedConversation || !this.attachSelectedFile) return;

    this.attachLoading = true;
    this.conversationService.attachFile(this.selectedConversation.id, this.attachSelectedFile).subscribe({
      next: (conv) => this.onAttachSuccess(conv),
      error: () => {
        this.attachLoading = false;
        this.errorMessage = "Impossible d'associer ce fichier.";
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.attachUploadFile = input.files?.[0] ?? null;
    this.attachUploadError = null;
  }

  startUpload() {
    if (!this.selectedConversation || !this.attachUploadFile) return;

    const conversationId = this.selectedConversation.id;
    const file = this.attachUploadFile;

    this.attachUploading = true;
    this.attachUploadError = null;
    this.attachUploadStatus = null;

    this.conversationService.uploadFile(conversationId, file).subscribe({
      next: ({ jobId }) => this.pollUploadStatus(conversationId, jobId, file.name),
      error: () => {
        this.attachUploading = false;
        this.attachUploadError = "Échec de l'envoi du fichier.";
      }
    });
  }

  private pollUploadStatus(conversationId: number, jobId: string, originalFilename: string) {
    this.uploadPollHandle = setInterval(() => {
      this.conversationService.getUploadStatus(jobId).subscribe({
        next: (job) => {
          this.attachUploadStatus = job;

          if (job.status === 'DONE') {
            this.stopUploadPolling();
            this.conversationService.attachFile(conversationId, originalFilename).subscribe({
              next: (conv) => this.onAttachSuccess(conv),
              error: () => {
                this.attachUploading = false;
                this.attachUploadError = "Le rapport a bien été traité mais n'a pas pu être associé.";
              }
            });
          } else if (job.status === 'FAILED') {
            this.stopUploadPolling();
            this.attachUploading = false;
            this.attachUploadError = job.result?.error || 'Le traitement du fichier a échoué.';
          }
        },
        error: () => {
          this.stopUploadPolling();
          this.attachUploading = false;
          this.attachUploadError = 'Impossible de suivre la progression du traitement.';
        }
      });
    }, 1500);
  }

  private stopUploadPolling() {
    if (this.uploadPollHandle) {
      clearInterval(this.uploadPollHandle);
      this.uploadPollHandle = null;
    }
  }

  private onAttachSuccess(conv: ConversationDto) {
    this.selectedConversation = conv;
    const idx = this.conversations.findIndex((c) => c.id === conv.id);
    if (idx !== -1) this.conversations[idx] = conv;
    this.attachLoading = false;
    this.attachUploading = false;
    this.attachDialogVisible = false;
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  ngOnDestroy() {
    this.stopUploadPolling();
  }
}
