import { Injectable } from '@angular/core';
import { Observable, switchMap, map } from 'rxjs';
import { HttpClientService } from './http-client.service';
import { MultilingualActivityTemplates } from './multilingual-activity-templates.service';

// Backend-compatible interfaces
export interface ActivityTypeResponse {
  id: number;
  name_en: string;
  name_ta: string;
  name_si: string;
  jsonMethod?: string;
  mainActivityId: number;
}

export interface ActivityTypeCreateDto {
  name_en: string;
  name_ta: string;
  name_si: string;
  jsonMethod?: string;
  mainActivityId: number;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityTypeApiService {
  private readonly endpoint = '/ActivityTypes';

  constructor(private httpClient: HttpClientService) {}

  getAll(): Observable<ActivityTypeResponse[]> {
    return this.httpClient.get<ActivityTypeResponse[]>(this.endpoint);
  }

  getByMainActivity(mainActivityId: number): Observable<ActivityTypeResponse[]> {
    return this.httpClient.get<ActivityTypeResponse[]>(
      `${this.endpoint}/by-main-activity/${mainActivityId}`
    );
  }

  create(newItem: ActivityTypeCreateDto): Observable<ActivityTypeResponse> {
    // Step 1: Create the record normally
    return this.httpClient
      .post<ActivityTypeResponse, ActivityTypeCreateDto>(this.endpoint, newItem)
      .pipe(
        // Step 2: After creation, compute JSON from the returned id and update the record
        switchMap((created) => {
          const json = MultilingualActivityTemplates.getTemplate(created.id);
          return this.httpClient
            .put<void, Partial<ActivityTypeCreateDto>>(`${this.endpoint}/${created.id}`, {
              name_en: created.name_en,
              name_ta: created.name_ta,
              name_si: created.name_si,
              jsonMethod: json,
              mainActivityId: created.mainActivityId || newItem.mainActivityId, // Include mainActivityId
            })
            .pipe(map(() => ({ ...created, jsonMethod: json })));
        })
      );
  }

  update(id: number, itemToUpdate: Partial<ActivityTypeCreateDto>): Observable<ActivityTypeResponse> {
    // Ensure json is present when updating if caller didn't send it
    const payload: Partial<ActivityTypeCreateDto> = { ...itemToUpdate };
    if (!payload.jsonMethod) {
      payload.jsonMethod = MultilingualActivityTemplates.getTemplate(id);
    }
    return this.httpClient.put<ActivityTypeResponse, Partial<ActivityTypeCreateDto>>(`${this.endpoint}/${id}`, payload);
  }

  deleteItem(id: number): Observable<void> {
    return this.httpClient.delete(`${this.endpoint}/${id}`);
  }
}