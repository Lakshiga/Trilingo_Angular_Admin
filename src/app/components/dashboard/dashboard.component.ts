import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
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
import { DashboardApiService, ActivityTypeStatistic, UserStatistic } from '../../services/dashboard-api.service';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

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
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
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

  // Chart data
  activityTypeChart: Chart | null = null;
  userPieChart: Chart | null = null;
  activityTypeData: ActivityTypeStatistic[] = [];
  userData: UserStatistic[] = [];

  constructor(
    private router: Router,
    private levelApiService: LevelApiService,
    private lessonApiService: LessonApiService,
    private activityApiService: ActivityApiService,
    private exerciseApiService: ExerciseApiService,
    private mainActivityApiService: MainActivityApiService,
    private activityTypeApiService: ActivityTypeApiService,
    private dashboardApiService: DashboardApiService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  ngAfterViewInit() {
    // Charts will be created after data is loaded
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Destroy charts
    if (this.activityTypeChart) {
      this.activityTypeChart.destroy();
    }
    if (this.userPieChart) {
      this.userPieChart.destroy();
    }
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
        
        // Load chart data
        this.loadChartData();
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.error = 'Failed to load dashboard data. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private loadChartData() {
    console.log('Loading chart data...');
    
    forkJoin({
      activityTypeStats: this.dashboardApiService.getActivityTypeStatistics().pipe(
        catchError((error) => {
          console.error('❌ Error loading activity type statistics:', {
            status: error?.status,
            statusText: error?.statusText,
            message: error?.message,
            error: error?.error,
            url: error?.url
          });
          return [];
        })
      ),
      userStats: this.dashboardApiService.getUserStatistics().pipe(
        catchError((error) => {
          console.error('❌ Error loading user statistics:', {
            status: error?.status,
            statusText: error?.statusText,
            message: error?.message,
            error: error?.error,
            url: error?.url
          });
          return [];
        })
      )
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        console.log('✅ Chart data loaded:', {
          activityTypeStats: data.activityTypeStats,
          activityTypeCount: data.activityTypeStats?.length || 0,
          userStats: data.userStats,
          userStatsCount: data.userStats?.length || 0
        });
        
        this.activityTypeData = data.activityTypeStats || [];
        this.userData = data.userStats || [];
        
        if (this.activityTypeData.length === 0) {
          console.warn('⚠️ No activity type data available - database might be empty or API call failed');
        }
        if (this.userData.length === 0) {
          console.warn('⚠️ No user data available - database might be empty or API call failed');
        }
        
        if (this.activityTypeData.length > 0 || this.userData.length > 0) {
          this.createCharts();
        }
      },
      error: (err) => {
        console.error('❌ Error loading chart data:', err);
      }
    });
  }

  private createCharts() {
    // Destroy existing charts if they exist
    if (this.activityTypeChart) {
      this.activityTypeChart.destroy();
    }
    if (this.userPieChart) {
      this.userPieChart.destroy();
    }

    // Wait for view to be ready
    setTimeout(() => {
      // Create Bar Chart
      const activityTypeCtx = document.getElementById('activityTypeChart') as HTMLCanvasElement;
      if (activityTypeCtx && this.activityTypeData.length > 0) {

      console.log('📊 Creating chart with data:', this.activityTypeData);

      // Deduplicate by mainActivityId to ensure one entry per main activity
      const uniqueData = new Map<number, { name: string; count: number }>();
      this.activityTypeData.forEach(item => {
        console.log('Processing item:', item);
        if (!uniqueData.has(item.mainActivityId)) {
          uniqueData.set(item.mainActivityId, {
            name: item.mainActivityName,
            count: item.activityTypeCount
          });
        } else {
          // If duplicate, sum the counts
          const existing = uniqueData.get(item.mainActivityId)!;
          existing.count += item.activityTypeCount;
        }
      });

      // Sort by name and extract arrays
      const sortedData = Array.from(uniqueData.values()).sort((a, b) => a.name.localeCompare(b.name));
      const mainActivityNames = sortedData.map(item => item.name);
      const activityTypeCounts = sortedData.map(item => {
        const count = Number(item.count) || 0;
        console.log(`Count for ${item.name}: ${count}`);
        return count;
      });

      console.log('📊 Chart data prepared:', {
        labels: mainActivityNames,
        counts: activityTypeCounts,
        sortedData: sortedData,
        hasData: activityTypeCounts.some(c => c > 0)
      });

      // Ensure we have valid data
      if (mainActivityNames.length === 0 || activityTypeCounts.every(c => c === 0)) {
        console.warn('⚠️ No valid data to display in chart');
        return;
      }

        // Gradient color palette (dark blue to light teal/mint green) - matching second image style
        const gradientColors = [
          'rgba(52, 110, 140, 0.9)',   // Dark Blue (leftmost)
          'rgba(79, 163, 247, 0.9)',   // Medium Blue
          'rgba(52, 152, 219, 0.9)',   // Bright Blue
          'rgba(46, 204, 113, 0.9)',   // Teal Green
          'rgba(26, 188, 156, 0.9)',   // Darker Teal
          'rgba(85, 239, 196, 0.9)'    // Light Mint Green (rightmost)
        ];

        const gradientBorderColors = [
          'rgba(52, 110, 140, 1)',
          'rgba(79, 163, 247, 1)',
          'rgba(52, 152, 219, 1)',
          'rgba(46, 204, 113, 1)',
          'rgba(26, 188, 156, 1)',
          'rgba(85, 239, 196, 1)'
        ];
        
        try {
          this.activityTypeChart = new Chart(activityTypeCtx, {
            type: 'bar',
            data: {
              labels: mainActivityNames, // X-axis: Main Activities (6 main activities)
              datasets: [{
                label: 'Number of Activity Types',
                data: activityTypeCounts, // Y-axis: Count of Activity Types per main activity
                backgroundColor: mainActivityNames.map((_, index) => gradientColors[index % gradientColors.length]),
                borderColor: mainActivityNames.map((_, index) => gradientBorderColors[index % gradientBorderColors.length]),
                borderWidth: 2,
                borderRadius: 4
              }]
            },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  font: {
                    size: 12
                  }
                }
              },
              title: {
                display: true,
                text: 'Activity Types Count by Main Activity',
                font: {
                  size: 16
                }
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Main Activity',
                  font: {
                    size: 14
                  }
                }
              },
              y: {
                beginAtZero: true,
                min: 0,
                max: 8, // Set max to 8 as per user requirement
                ticks: {
                  stepSize: 1,
                  callback: function(value) {
                    return Number.isInteger(value) ? value : '';
                  }
                },
                title: {
                  display: true,
                  text: 'Number of Activity Types (Count)',
                  font: {
                    size: 14
                  }
                }
              }
            }
          }
        });
        console.log('✅ Chart created successfully');
      } catch (error) {
        console.error('❌ Error creating chart:', error);
      }
      }

      // Create User Pie Chart (larger size)
      const userCtx = document.getElementById('userPieChart') as HTMLCanvasElement;
      if (userCtx && this.userData.length > 0) {
        const labels = this.userData.map(d => d.roleName);
        const counts = this.userData.map(d => d.count);
        
        this.userPieChart = new Chart(userCtx, {
          type: 'pie',
          data: {
            labels: labels,
            datasets: [{
              label: 'Users by Role',
              data: counts,
              backgroundColor: [
                'rgba(52, 110, 140, 0.8)',
                'rgba(79, 163, 247, 0.8)',
                'rgba(108, 99, 255, 0.8)',
                'rgba(249, 115, 22, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(244, 63, 94, 0.8)'
              ],
              borderColor: [
                'rgba(52, 110, 140, 1)',
                'rgba(79, 163, 247, 1)',
                'rgba(108, 99, 255, 1)',
                'rgba(249, 115, 22, 1)',
                'rgba(16, 185, 129, 1)',
                'rgba(244, 63, 94, 1)'
              ],
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 15,
                  font: {
                    size: 12
                  }
                }
              },
              title: {
                display: true,
                text: 'Users Distribution by Role',
                font: {
                  size: 16
                }
              }
            }
          }
        });
      }
    }, 200);
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
