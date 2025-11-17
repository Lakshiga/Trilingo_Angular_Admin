import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

// Backend-compatible interfaces
export interface LevelResponse {
  id: number;
  name_en: string;
  name_ta: string;
  name_si: string;
  languageId: number;
}

export interface LevelCreateDto {
  name_en: string;
  name_ta: string;
  name_si: string;
  languageId: number;
}

@Injectable({
  providedIn: 'root'
})
export class LevelApiService {
  private readonly endpoint = '/Levels';

  constructor(private httpClient: HttpClientService) {}

  getAll(): Observable<LevelResponse[]> {
    return this.httpClient.get<LevelResponse[]>(this.endpoint);
  }

  create(newItem: LevelCreateDto): Observable<LevelResponse> {
    return this.httpClient.post<LevelResponse, LevelCreateDto>(this.endpoint, newItem);
  }

  update(id: number, itemToUpdate: Partial<LevelCreateDto>): Observable<LevelResponse> {
    return this.httpClient.put<LevelResponse, Partial<LevelCreateDto>>(`${this.endpoint}/${id}`, itemToUpdate);
  }

  deleteItem(id: number): Observable<void> {
    return this.httpClient.delete(`${this.endpoint}/${id}`);
  }

  uploadCoverImage(levelId: number, file: File): Observable<LevelResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.httpClient.post<LevelResponse, FormData>(
      `${this.endpoint}/${levelId}/cover-image`, 
      formData
    );
  }
}