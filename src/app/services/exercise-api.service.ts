import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface Exercise {
  id: number;
  activityId: number;
  jsonData: string;
  sequenceOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExerciseDto {
  activityId: number;
  jsonData: string;
  sequenceOrder: number;
}

export interface UpdateExerciseDto {
  jsonData?: string;
  sequenceOrder?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseApiService {
  private readonly endpoint = '/exercises';

  constructor(private httpClient: HttpClientService) {}

  // GET all exercises
  getAll(): Observable<Exercise[]> {
    return this.httpClient.get<Exercise[]>(this.endpoint);
  }

  // GET exercises by activity ID
  getByActivityId(activityId: number): Observable<Exercise[]> {
    return this.httpClient.get<Exercise[]>(`/activities/${activityId}/exercises`);
  }

  // GET single exercise by ID
  getById(id: number): Observable<Exercise> {
    return this.httpClient.get<Exercise>(`${this.endpoint}/${id}`);
  }

  // POST create new exercise
  create(dto: CreateExerciseDto): Observable<Exercise> {
    return this.httpClient.post<Exercise, CreateExerciseDto>(this.endpoint, dto);
  }

  // PUT update exercise
  update(id: number, dto: UpdateExerciseDto): Observable<Exercise> {
    return this.httpClient.put<Exercise, UpdateExerciseDto>(`${this.endpoint}/${id}`, dto);
  }

  // DELETE exercise
  delete(id: number): Observable<void> {
    return this.httpClient.delete(`${this.endpoint}/${id}`);
  }
}
