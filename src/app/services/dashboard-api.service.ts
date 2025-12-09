import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface ActivityTypeStatistic {
  mainActivityId: number;
  mainActivityName: string;
  activityTypeCount: number; // Count of activity types per main activity
}

export interface UserStatistic {
  roleId: string;
  roleName: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardApiService {
  constructor(private httpClient: HttpClientService) {}

  getActivityTypeStatistics(): Observable<ActivityTypeStatistic[]> {
    return this.httpClient.get<ActivityTypeStatistic[]>('/Dashboard/activity-type-statistics');
  }

  getUserStatistics(): Observable<UserStatistic[]> {
    return this.httpClient.get<UserStatistic[]>('/Dashboard/user-statistics');
  }
}

