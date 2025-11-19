import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { LevelApiService } from '../../services/level-api.service';
import { LessonApiService } from '../../services/lesson-api.service';
import { ActivityApiService } from '../../services/activity-api.service';
import { ExerciseApiService } from '../../services/exercise-api.service';
import { MainActivityApiService } from '../../services/main-activity-api.service';
import { ActivityTypeApiService } from '../../services/activity-type-api.service';

interface DashboardStats {
  totalLevels: number;
  totalLessons: number;
  totalActivities: number;
  totalExercises: number;
  totalMainActivities: number;
  totalActivityTypes: number;
}

interface RecentActivity {
  name: string;
  type: string;
  status: string;
  updated: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats = {
    totalLevels: 0,
    totalLessons: 0,
    totalActivities: 0,
    totalExercises: 0,
    totalMainActivities: 0,
    totalActivityTypes: 0
  };
  
  recentActivities: RecentActivity[] = [];
  isLoading = true;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private levelApiService: LevelApiService,
    private lessonApiService: LessonApiService,
    private activityApiService: ActivityApiService,
    private exerciseApiService: ExerciseApiService,
    private mainActivityApiService: MainActivityApiService,
    private activityTypeApiService: ActivityTypeApiService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData() {
    this.isLoading = true;
    this.error = null;

    // Fetch all data in parallel
    forkJoin({
      levels: this.levelApiService.getAll().pipe(
        catchError(() => [])
      ),
      exercises: this.exerciseApiService.getAll().pipe(
        catchError(() => [])
      ),
      mainActivities: this.mainActivityApiService.getAll().pipe(
        catchError(() => [])
      ),
      activityTypes: this.activityTypeApiService.getAll().pipe(
        catchError(() => [])
      )
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        // Calculate counts
        this.stats.totalLevels = data.levels?.length || 0;
        this.stats.totalExercises = data.exercises?.length || 0;
        this.stats.totalMainActivities = data.mainActivities?.length || 0;
        this.stats.totalActivityTypes = data.activityTypes?.length || 0;

        // For lessons and activities, we need to fetch all levels first and then get lessons/activities
        this.loadLessonsAndActivities(data.levels || []);
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.error = 'Failed to load dashboard data. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private loadLessonsAndActivities(levels: any[]) {
    if (levels.length === 0) {
      this.isLoading = false;
      return;
    }

    // Get all lessons for all levels
    const lessonRequests = levels.map(level => 
      this.lessonApiService.getLessonsByLevelId(level.id).pipe(
        catchError(() => [])
      )
    );

    forkJoin(lessonRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lessonsArrays) => {
          const allLessons = lessonsArrays.flat();
          this.stats.totalLessons = allLessons.length;

          // Get all activities for all lessons
          if (allLessons.length === 0) {
            this.isLoading = false;
            return;
          }

          const activityRequests = allLessons.map(lesson =>
            this.activityApiService.getActivitiesByLessonId(lesson.lessonId).pipe(
              catchError(() => [])
            )
          );

          forkJoin(activityRequests)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (activitiesArrays) => {
                const allActivities = activitiesArrays.flat();
                this.stats.totalActivities = allActivities.length;
                
                // Populate recent activities (last 10)
                this.recentActivities = allActivities
                  .slice(-10)
                  .reverse()
                  .map(activity => ({
                    name: activity.title?.en || activity.title?.ta || activity.title?.si || 'Untitled Activity',
                    type: activity.activityType?.activityName || 'Unknown',
                    status: 'Active',
                    updated: new Date() // You may want to add an updatedAt field to Activity type
                  }));
                
                this.isLoading = false;
              },
              error: (err) => {
                console.error('Error loading activities:', err);
                this.isLoading = false;
              }
            });
        },
        error: (err) => {
          console.error('Error loading lessons:', err);
          this.isLoading = false;
        }
      });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  refresh() {
    this.loadDashboardData();
  }
}
