import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChatbotApiService, ChatbotRequest } from '../../services/chatbot-api.service';
import { trigger, transition, style, animate } from '@angular/animations';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class ChatbotComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  isOpen = false;
  messages: ChatMessage[] = [];
  currentMessage = '';
  isLoading = false;
  conversationId: string | null = null;

  constructor(private chatbotApiService: ChatbotApiService) {}

  ngOnInit(): void {
    // Add welcome message
    this.messages.push({
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you with the admin panel today?',
      timestamp: new Date()
    });
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => {
        this.scrollToBottom();
        this.messageInput?.nativeElement?.focus();
      }, 100);
    }
  }

  closeChat(): void {
    this.isOpen = false;
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) {
      return;
    }

    const userMessage = this.currentMessage.trim();
    this.currentMessage = '';

    // Add user message
    this.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    this.scrollToBottom();
    this.isLoading = true;

    const request: ChatbotRequest = {
      message: userMessage,
      conversationId: this.conversationId || undefined
    };

    this.chatbotApiService.sendMessage(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.isSuccess) {
          if (response.conversationId) {
            this.conversationId = response.conversationId;
          }
          this.messages.push({
            role: 'assistant',
            content: response.message,
            timestamp: new Date()
          });
        } else {
          // Handle error response (IsSuccess = false)
          const errorMsg = response.error || response.message || 'Sorry, I encountered an error. Please try again.';
          this.messages.push({
            role: 'assistant',
            content: errorMsg,
            timestamp: new Date()
          });
        }
        this.scrollToBottom();
      },
      error: (error) => {
        this.isLoading = false;
        let errorMessage = 'Sorry, I couldn\'t process your request. Please check your connection and try again.';
        
        // Try to extract error from response body
        if (error?.error) {
          // Check if it's a ChatbotResponse structure
          if (error.error.isSuccess !== undefined) {
            errorMessage = error.error.error || error.error.message || errorMessage;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        this.messages.push({
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date()
        });
        this.scrollToBottom();
        console.error('Chatbot error:', error);
      }
    });
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.messages = [{
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you with the admin panel today?',
      timestamp: new Date()
    }];
    this.conversationId = null;
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }
}

