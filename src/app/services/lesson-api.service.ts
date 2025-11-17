import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClientService } from './http-client.service';
import { Lesson } from '../types/lesson.types';
import { MultilingualText } from '../types/multilingual.types';

export interface MultilingualLesson {
  lessonId: number;
  levelId: number;
  lessonName: MultilingualText;
  sequenceOrder: number;
  level?: { levelId: number; levelName: MultilingualText };
}

export interface LessonCreateDto {
  levelId: number;
  lessonName: MultilingualText;
  sequenceOrder: number;
}

@Injectable({
  providedIn: 'root'
})
export class LessonApiService {
  // Backend calls these "Stages". We map "lessons" <-> stages in the frontend.
  private readonly endpoint = '/Stages';

  constructor(private httpClient: HttpClientService) {}

  // GET lessons (stages) for a specific level
  getLessonsByLevelId(levelId: number | string): Observable<MultilingualLesson[]> {
    return this.httpClient
      .get<any[]>(this.endpoint)
      .pipe(
        map(list => (list || []).map(s => this.toLesson(s)).filter(l => String(l.levelId) === String(levelId)))
      );
  }

  // POST a new lesson
  create(newItem: LessonCreateDto): Observable<MultilingualLesson> {
    const dto = this.toCreateStageDto(newItem);
    return this.httpClient
      .post<any, any>(this.endpoint, dto)
      .pipe(map(res => this.toLesson(res)));
  }

  // PUT (update) an existing lesson
  update(id: number | string, itemToUpdate: Partial<LessonCreateDto>): Observable<MultilingualLesson> {
    const dto = this.toUpdateStageDto(itemToUpdate);
    return this.httpClient
      .put<any, any>(`${this.endpoint}/${id}`, dto)
      .pipe(map(res => this.toLesson(res)));
  }

  // DELETE a lesson
  delete(id: number | string): Observable<void> {
    return this.httpClient.delete(`${this.endpoint}/${id}`);
  }

  // GET a single lesson by its ID (useful for getting the parent lesson name)
  getLessonById(lessonId: number | string): Observable<MultilingualLesson> {
    return this.httpClient.get<any>(`${this.endpoint}/${lessonId}`).pipe(map(res => this.toLesson(res)));
  }

  // DELETE lesson (alias for delete)
  deleteItem(lessonId: number | string): Observable<void> {
    return this.delete(lessonId);
  }

  // Mapping helpers
  private toLesson(stageDto: any): MultilingualLesson {
    return {
      lessonId: stageDto?.id,
      levelId: stageDto?.levelId,
      lessonName: { en: stageDto?.name_en || '', ta: stageDto?.name_ta || '', si: stageDto?.name_si || '' },
      sequenceOrder: 1
    } as MultilingualLesson;
  }

  private toCreateStageDto(item: LessonCreateDto): any {
    return {
      name_en: item?.lessonName?.en || '',
      name_ta: item?.lessonName?.ta || '',
      name_si: item?.lessonName?.si || '',
      levelId: item?.levelId
    };
  }

  private toUpdateStageDto(item: Partial<LessonCreateDto>): any {
    return {
      name_en: item?.lessonName?.en,
      name_ta: item?.lessonName?.ta,
      name_si: item?.lessonName?.si
    };
  }

  // All lesson operations are API-only. No localStorage fallbacks.
}
