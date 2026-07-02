import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { AssistantService, AssistantResponseDto } from '../../core/services/assistant.service';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TextareaModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule
  ],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.scss'
})
export class AssistantComponent {

  question = '';
  loading = false;
  response: AssistantResponseDto | null = null;
  errorMessage: string | null = null;

  constructor(private assistantService: AssistantService) {}

  ask() {
    if (!this.question.trim()) return;

    this.loading = true;
    this.response = null;
    this.errorMessage = null;

    this.assistantService.askQuestion(this.question).subscribe({
      next: (res) => {
        this.response = res;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erreur lors de la génération de la réponse.';
        this.loading = false;
      }
    });
  }
}
