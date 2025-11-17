import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
// MatTypographyModule is not available in Angular Material v19
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ActivityPlayerModalComponent } from '../../components/activities/activity-player-modal/activity-player-modal.component';
import { SidebarLanguageManagerComponent } from '../../components/common/sidebar-language-manager/sidebar-language-manager.component';
import { ActivityApiService, MultilingualActivity } from '../../services/activity-api.service';
import { LessonApiService, MultilingualLesson } from '../../services/lesson-api.service';
import { ActivityTypeApiService, ActivityTypeResponse } from '../../services/activity-type-api.service';
import { Activity } from '../../types/activity.types';
import { Lesson } from '../../types/lesson.types';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-activities-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RouterLink,
    ActivityPlayerModalComponent,
    SidebarLanguageManagerComponent
  ],
  templateUrl: './activities-list.component.html',
  styleUrls: ['./activities-list.component.css']
})
export class ActivitiesListPageComponent implements OnInit, OnDestroy {
  lessonId: string | null = null;
  activities: MultilingualActivity[] = [];
  lesson: MultilingualLesson | null = null;
  isLoading = true;
  error: string | null = null;
  
  isPreviewOpen = false;
  activityToPreview: MultilingualActivity | null = null;
  isPreviewLoading = false;
  
  displayedColumns: string[] = ['id', 'title', 'type', 'order', 'preview', 'actions'];
  activityTypeMap: Record<number, string> = {};
  
  private routeSubscription?: Subscription;
  private previewOnLoadId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activityApiService: ActivityApiService,
    private lessonApiService: LessonApiService,
    private activityTypeApiService: ActivityTypeApiService,
    private snackBar: MatSnackBar,
    public languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      this.lessonId = params['lessonId'];
      this.previewOnLoadId = params['previewId'] ? Number(params['previewId']) : null;
      // Clear existing data before loading new data
      this.activities = [];
      this.lesson = null;
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  private async loadData(): Promise<void> {
    if (!this.lessonId) {
      this.error = "Error: No Lesson ID provided.";
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = null;
    
    try {
      const lessonObservable = this.lessonApiService.getLessonById(parseInt(this.lessonId, 10));
      const activitiesObservable = this.activityApiService.getAllByLessonId(parseInt(this.lessonId, 10));
      const typesObservable = this.activityTypeApiService.getAll();
      
      const [lessonData, activitiesData, typesData] = await Promise.all([
        lessonObservable.toPromise(),
        activitiesObservable.toPromise(),
        typesObservable.toPromise()
      ]);
      
      this.lesson = lessonData!;
      this.activities = activitiesData!;
      (typesData || []).forEach((t: ActivityTypeResponse) => {
        this.activityTypeMap[t.id] = t.name_en || t.name_ta || t.name_si || String(t.id);
      });
      
      // Log the activities for debugging
      console.log('Loaded activities:', this.activities);

      // Auto-open preview if requested
      if (this.previewOnLoadId) {
        setTimeout(() => this.openPreview(this.previewOnLoadId as number), 0);
        this.previewOnLoadId = null;
      }
    } catch (err) {
      console.error(err);
      this.error = err instanceof Error ? err.message : "Failed to load data for this lesson.";
    } finally {
      this.isLoading = false;
    }
  }

  getDisplayText(content: any): string {
    if (typeof content === 'string') return content;
    if (content && typeof content === 'object') {
      return this.languageService.getText(content);
    }
    return '';
  }

  async deleteActivity(activityId: number): Promise<void> {
    if (confirm("Are you sure you want to delete this activity?")) {
      try {
        // Convert Observable to Promise and wait for completion
        await this.activityApiService.deleteItem(activityId).toPromise();
        // Reload data from server to ensure UI reflects actual database state
        await this.loadData();
        this.snackBar.open('Activity deleted successfully', 'Close', { duration: 3000 });
      } catch (err: any) {
        console.error('Delete activity error:', err);
        let errorMessage = "Failed to delete activity.";
        
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (err?.error?.message) {
          errorMessage = err.error.message;
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    }
  }

  async openPreview(activityId: number): Promise<void> {
    // Validate activityId before proceeding
    if (!activityId || activityId <= 0) {
      console.error("Invalid activity ID for preview:", activityId);
      this.snackBar.open("Invalid activity ID for preview.", 'Close', { duration: 5000 });
      return;
    }
    
    this.isPreviewOpen = true;
    this.isPreviewLoading = true;
    
    try {
      const fullActivityData = await this.activityApiService.getById(activityId).toPromise();
      this.activityToPreview = fullActivityData!;
    } catch (err) {
      console.error("Failed to fetch activity details for preview", err);
      this.snackBar.open("Could not load activity preview.", 'Close', { duration: 5000 });
      this.isPreviewOpen = false;
    } finally {
      this.isPreviewLoading = false;
    }
  }

  closePreview(): void {
    this.isPreviewOpen = false;
    this.activityToPreview = null;
  }

  goBack(): void {
    try {
      if (this.lesson && this.lesson.levelId) {
        this.router.navigate(['lessons'], { queryParams: { levelId: this.lesson.levelId } })
          .catch(err => {
            console.error('Navigation error:', err);
            // Fallback to levels if navigation fails
            this.router.navigate(['levels']);
          });
      } else {
        this.router.navigate(['levels']).catch(err => {
          console.error('Navigation error:', err);
        });
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to levels page
      this.router.navigate(['levels']);
    }
  }
}