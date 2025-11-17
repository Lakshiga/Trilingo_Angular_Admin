import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';
import { MainActivity } from '../types/main-activity.types';

// Backend-compatible interfaces
export interface MainActivityResponse {
  id: number;
  name_en: string;
  name_ta: string;
  name_si: string;
}

export interface MainActivityCreateDto {
  name_en: string;
  name_ta: string;
  name_si: string;
}

@Injectable({
  providedIn: 'root'
})
export class MainActivityApiService {
  private readonly endpoint = '/MainActivities';

  constructor(private httpClient: HttpClientService) {}

  // GET all main activities
  getAll(): Observable<MainActivityResponse[]> {
    return this.httpClient.get<MainActivityResponse[]>(this.endpoint);
  }

  // POST a new main activity
  create(newItem: MainActivityCreateDto): Observable<MainActivityResponse> {
    return this.httpClient.post<MainActivityResponse, MainActivityCreateDto>(this.endpoint, newItem);
  }

  // PUT (update) an existing main activity
  update(id: number | string, itemToUpdate: Partial<MainActivityCreateDto>): Observable<MainActivityResponse> {
    return this.httpClient.put<MainActivityResponse, Partial<MainActivityCreateDto>>(`${this.endpoint}/${id}`, itemToUpdate);
  }

  // DELETE a main activity
  deleteItem(id: number | string): Observable<void> {
    return this.httpClient.delete(`${this.endpoint}/${id}`);
  }
}