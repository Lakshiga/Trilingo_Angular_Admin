import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface ChatbotRequest {
  message: string;
  conversationId?: string;
}

export interface ChatbotResponse {
  isSuccess: boolean;
  message: string;
  conversationId?: string;
  error?: string;
  imageData?: string; // Base64 encoded image data
  hasImage?: boolean; // Indicates if response contains an image
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotApiService {
  private readonly endpoint = '/chatbot';

  constructor(private httpClient: HttpClientService) {}

  sendMessage(request: ChatbotRequest): Observable<ChatbotResponse> {
    return this.httpClient.post<ChatbotResponse, ChatbotRequest>(`${this.endpoint}/chat`, request);
  }
}

