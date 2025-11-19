import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivityPlayerModalComponent } from '../../components/activities/activity-player-modal/activity-player-modal.component';
import { SidebarLanguageManagerComponent } from '../../components/common/sidebar-language-manager/sidebar-language-manager.component';
import { MultilingualInputComponent } from '../../components/common/multilingual-input/multilingual-input.component';
import { ActivityApiService, MultilingualActivity, ActivityCreateDto, ActivityUpdateDto } from '../../services/activity-api.service';
import { LessonApiService, MultilingualLesson } from '../../services/lesson-api.service';
import { ActivityTypeApiService, ActivityTypeResponse } from '../../services/activity-type-api.service';
import { MainActivityApiService } from '../../services/main-activity-api.service';
import { Activity } from '../../types/activity.types';
import { Lesson } from '../../types/lesson.types';
import { LanguageService } from '../../services/language.service';
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MultilingualText } from '../../types/multilingual.types';

@Component({
  selector: 'app-activities-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    RouterLink,
    ActivityPlayerModalComponent,
    SidebarLanguageManagerComponent,
    MultilingualInputComponent
  ],
  templateUrl: './activities-list.component.html',
  styleUrls: ['./activities-list.component.css']
})
export class ActivitiesListPageComponent implements OnInit, OnDestroy {
  lessonId: string | null = null;
  numericLessonId: number = 0;
  activities: MultilingualActivity[] = [];
  lesson: MultilingualLesson | null = null;
  isLoading = true;
  error: string | null = null;
  
  isPreviewOpen = false;
  activityToPreview: MultilingualActivity | null = null;
  isPreviewLoading = false;
  
  // Adding
  isAdding = false;
  newActivity: Partial<ActivityCreateDto> = {};
  
  // Dropdowns
  activityTypes: ActivityTypeResponse[] = [];
  mainActivities: any[] = [];
  
  displayedColumns: string[] = ['id', 'title', 'sequenceOrder', 'activityType', 'preview', 'manageExercises', 'actions'];
  activityTypeMap: Record<number, string> = {};
  
  private routeSubscription?: Subscription;
  private previewOnLoadId: number | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activityApiService: ActivityApiService,
    private lessonApiService: LessonApiService,
    private activityTypeApiService: ActivityTypeApiService,
    private mainActivityApiService: MainActivityApiService,
    private snackBar: MatSnackBar,
    public languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      this.lessonId = params['lessonId'];
      this.numericLessonId = this.lessonId ? parseInt(this.lessonId, 10) : 0;
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadData(): Promise<void> {
    if (!this.lessonId || !this.numericLessonId) {
      this.error = "Error: No Lesson ID provided.";
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = null;
    
    try {
      const lessonObservable = this.lessonApiService.getLessonById(this.numericLessonId);
      const activitiesObservable = this.activityApiService.getAllByLessonId(this.numericLessonId);
      const typesObservable = this.activityTypeApiService.getAll();
      const mainActivitiesObservable = this.mainActivityApiService.getAll();
      
      const [lessonData, activitiesData, typesData, mainActivitiesData] = await Promise.all([
        lessonObservable.toPromise(),
        activitiesObservable.toPromise(),
        typesObservable.toPromise(),
        mainActivitiesObservable.toPromise()
      ]);
      
      this.lesson = lessonData!;
      this.activities = (activitiesData || []).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      this.activityTypes = typesData || [];
      this.mainActivities = mainActivitiesData || [];
      
      (this.activityTypes || []).forEach((t: ActivityTypeResponse) => {
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

  getActivityDisplayName(activity: MultilingualActivity): string {
    if (!activity.title) return 'Untitled Activity';
    return this.languageService.getText(activity.title) || 'Untitled Activity';
  }

  // Inline editing methods
  startAdding(): void {
    if (this.isAdding) return;
    this.isAdding = true;
    this.newActivity = {
      lessonId: this.numericLessonId,
      title: { en: '', ta: '', si: '' },
      sequenceOrder: this.activities.length > 0 ? Math.max(...this.activities.map(a => a.sequenceOrder)) + 1 : 1,
      activityTypeId: this.activityTypes.length > 0 ? this.activityTypes[0].id : 0,
      mainActivityId: this.mainActivities.length > 0 ? this.mainActivities[0].id : 0,
      contentJson: '[]'
    };
  }

  cancelEdit(): void {
    this.isAdding = false;
    this.newActivity = {};
  }

  saveActivity(): void {
    if (this.isAdding) {
      this.createActivity();
    }
  }

  createActivity(): void {
    if (!this.newActivity.title || !this.newActivity.sequenceOrder || !this.newActivity.activityTypeId) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    const createDto: ActivityCreateDto = {
      lessonId: this.numericLessonId,
      title: this.newActivity.title as MultilingualText,
      sequenceOrder: this.newActivity.sequenceOrder!,
      activityTypeId: this.newActivity.activityTypeId!,
      mainActivityId: this.newActivity.mainActivityId || 0,
      contentJson: this.newActivity.contentJson || '[]'
    };

    this.activityApiService.create(createDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Activity created successfully', 'Close', { duration: 3000 });
          this.cancelEdit();
          this.loadData();
        },
        error: (err) => {
          console.error('Error creating activity:', err);
          this.snackBar.open('Failed to create activity', 'Close', { duration: 5000 });
        }
      });
  }


  deleteActivity(activity: MultilingualActivity): void {
    if (confirm("Are you sure you want to delete this activity?")) {
      this.activityApiService.deleteItem(activity.activityId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Activity deleted successfully', 'Close', { duration: 3000 });
            this.loadData();
          },
          error: (err: any) => {
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
        });
    }
  }

  onNewActivityTitleChange(value: MultilingualText): void {
    this.newActivity.title = value;
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