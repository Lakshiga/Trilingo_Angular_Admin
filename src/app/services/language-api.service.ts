import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface LanguageResponse {
  id: number;
  languageName: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageApiService {
  private readonly endpoint = '/Languages';

  constructor(private httpClient: HttpClientService) {}

  getAll(): Observable<LanguageResponse[]> {
    return this.httpClient.get<LanguageResponse[]>(this.endpoint);
  }
}
