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

interface HierarchyLevel {
  name: string;
  lessons: any[];
}

interface HierarchyActivity {
  name: string;
  expanded: boolean;
  levels: HierarchyLevel[];
}

interface HierarchyMainActivity {
  name: string;
  expanded: boolean;
  activities: HierarchyActivity[];
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
  mainActivities: HierarchyMainActivity[] = [];
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

        // Store main activities for hierarchy
        this.mainActivities = (data.mainActivities || []).map((ma: any) => ({
          name: ma.name || ma.name_en || 'Unnamed Main Activity',
          expanded: false,
          activities: []
        }));

        // For lessons and activities, we need to fetch all levels first and then get lessons/activities
        this.loadLessonsAndActivities(data.levels || [], data.mainActivities || []);
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.error = 'Failed to load dashboard data. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private loadLessonsAndActivities(levels: any[], mainActivitiesData: any[]) {
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
                
                // Build hierarchy structure
                this.buildHierarchy(allActivities, allLessons, levels, mainActivitiesData);
                
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

  private buildHierarchy(activities: any[], lessons: any[], levels: any[], mainActivitiesData: any[]) {
    // Create a map of main activity ID to main activity
    const mainActivityMap = new Map<number, HierarchyMainActivity>();
    mainActivitiesData.forEach((ma: any) => {
      const mainActivity: HierarchyMainActivity = {
        name: ma.name || ma.name_en || 'Unnamed Main Activity',
        expanded: false,
        activities: []
      };
      mainActivityMap.set(ma.id, mainActivity);
    });

    // Group activities by activity type (which represents the "activity" in the hierarchy)
    const activityTypeMap = new Map<number, HierarchyActivity>();
    
    activities.forEach((activity: any) => {
      const activityTypeId = activity.activityTypeId;
      const mainActivityId = activity.mainActivityId;
      
      if (!activityTypeMap.has(activityTypeId)) {
        const activityTypeName = activity.activityType?.activityName || `Activity Type ${activityTypeId}`;
        activityTypeMap.set(activityTypeId, {
          name: activityTypeName,
          expanded: false,
          levels: []
        });
      }
    });

    // Group activities by lesson, then by level
    const levelMap = new Map<number, HierarchyLevel>();
    levels.forEach((level: any) => {
      levelMap.set(level.id, {
        name: level.name || level.name_en || `Level ${level.id}`,
        lessons: []
      });
    });

    // Populate lessons in levels
    lessons.forEach((lesson: any) => {
      const level = levelMap.get(lesson.levelId);
      if (level) {
        level.lessons.push(lesson);
      }
    });

    // Group activities by activity type and main activity
    activities.forEach((activity: any) => {
      const mainActivityId = activity.mainActivityId;
      const activityTypeId = activity.activityTypeId;
      const lessonId = activity.lessonId;
      
      // Find the lesson to get its level
      const lesson = lessons.find((l: any) => l.lessonId === lessonId);
      if (!lesson) return;
      
      const levelId = lesson.levelId;
      const level = levelMap.get(levelId);
      if (!level) return;

      const mainActivity = mainActivityMap.get(mainActivityId);
      if (!mainActivity) return;

      // Find or create the activity type entry
      let hierarchyActivity = mainActivity.activities.find(a => 
        a.name === (activity.activityType?.activityName || `Activity Type ${activityTypeId}`)
      );

      if (!hierarchyActivity) {
        hierarchyActivity = {
          name: activity.activityType?.activityName || `Activity Type ${activityTypeId}`,
          expanded: false,
          levels: []
        };
        mainActivity.activities.push(hierarchyActivity);
      }

      // Add level if not already present
      if (!hierarchyActivity.levels.find(l => l.name === level.name)) {
        hierarchyActivity.levels.push({ ...level });
      }
    });

    // Update mainActivities array
    this.mainActivities = Array.from(mainActivityMap.values());
  }
}
