import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClientService } from './http-client.service';
import { Activity } from '../types/activity.types';
import { MultilingualText } from '../types/multilingual.types';

export interface MultilingualActivity {
  activityId: number;
  lessonId: number;
  title: MultilingualText;
  sequenceOrder: number;
  activityTypeId: number;
  mainActivityId: number;
  contentJson: string;
  activityType?: { activityTypeId: number; activityName: string; title?: MultilingualText };
  mainActivity?: { id: number; name: string; title?: MultilingualText };
}

export interface ActivityCreateDto {
  lessonId: number;
  activityTypeId: number;
  title: MultilingualText;
  sequenceOrder: number;
  contentJson: string;
  mainActivityId: number;
}

export type ActivityUpdateDto = ActivityCreateDto;

@Injectable({
  providedIn: 'root'
})
export class ActivityApiService {
  private readonly endpoint = '/Activities';

  constructor(private httpClient: HttpClientService) {}

  // Backend DTOs
  private toFrontend(dto: any): MultilingualActivity {
    return {
      activityId: dto?.id ?? dto?.activityId,
      lessonId: dto?.stageId ?? dto?.lessonId ?? 0,
      title: { 
        ta: dto?.name_ta ?? dto?.Name_ta ?? dto?.title?.ta ?? dto?.title_ta ?? '', 
        en: dto?.name_en ?? dto?.Name_en ?? dto?.title?.en ?? dto?.title_en ?? '', 
        si: dto?.name_si ?? dto?.Name_si ?? dto?.title?.si ?? dto?.title_si ?? '' 
      },
      sequenceOrder: dto?.sequenceOrder ?? dto?.SequenceOrder ?? 1,
      activityTypeId: dto?.activityTypeId ?? 0,
      mainActivityId: dto?.mainActivityId ?? 0,
      contentJson: dto?.contentJson ?? dto?.details_JSON ?? dto?.Details_JSON ?? '[]'
    } as MultilingualActivity;
  }

  private toCreateDto(item: ActivityCreateDto): any {
    // Backend expects PascalCase keys as seen in GET responses
    return {
      Details_JSON: item.contentJson,
      StageId: item.lessonId,
      MainActivityId: item.mainActivityId,
      ActivityTypeId: item.activityTypeId,
      Name_en: (item?.title?.en ?? '').toString(),
      Name_ta: (item?.title?.ta ?? '').toString(),
      Name_si: (item?.title?.si ?? '').toString(),
      SequenceOrder: item.sequenceOrder
    };
  }

  private toUpdateDto(item: ActivityUpdateDto): any {
    // PUT uses the same shape
    const dto = this.toCreateDto(item as ActivityCreateDto);
    Object.keys(dto).forEach(key => {
      if (dto[key] === null || dto[key] === undefined) delete dto[key];
    });
    return dto;
  }

  // GET all activities for a specific lesson (use the proper endpoint)
  getActivitiesByLessonId(lessonId: number | string): Observable<MultilingualActivity[]> {
    return this.httpClient.get<any[]>(`/Activities/stage/${lessonId}`).pipe(
      map(list => (list || []).map(a => this.toFrontend(a)))
    );
  }

  // GET a single activity by its own ID
  getActivityById(activityId: number | string): Observable<MultilingualActivity> {
    return this.httpClient.get<any>(`${this.endpoint}/${activityId}`).pipe(
      map(dto => this.toFrontend(dto))
    );
  }

  // POST a new activity
  create(newItem: ActivityCreateDto): Observable<MultilingualActivity> {
    const dto = this.toCreateDto(newItem);
    return this.httpClient.post<any, any>(this.endpoint, dto).pipe(
      map(res => this.toFrontend(res))
    );
  }

  // PUT (update) an existing activity
  update(id: number | string, itemToUpdate: ActivityUpdateDto): Observable<MultilingualActivity> {
    const dto = this.toUpdateDto(itemToUpdate);
    return this.httpClient.put<any, any>(`${this.endpoint}/${id}`, dto).pipe(
      map(res => this.toFrontend(res))
    );
  }

  // DELETE an activity
  delete(id: number | string): Observable<void> {
    return this.httpClient.delete(`${this.endpoint}/${id}`);
  }

  // GET all activities by lesson ID (alias for getActivitiesByLessonId)
  getAllByLessonId(lessonId: number | string): Observable<MultilingualActivity[]> {
    return this.getActivitiesByLessonId(lessonId);
  }

  // GET activity by ID (alias for getActivityById)
  getById(activityId: number | string): Observable<MultilingualActivity> {
    return this.getActivityById(activityId);
  }

  // DELETE activity (alias for delete)
  deleteItem(activityId: number | string): Observable<void> {
    return this.delete(activityId);
  }

  // All data operations are API-only. No localStorage fallbacks.
}
