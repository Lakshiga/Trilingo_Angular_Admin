import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExerciseApiService, Exercise, CreateExerciseDto, UpdateExerciseDto } from '../../services/exercise-api.service';
import { ActivityApiService } from '../../services/activity-api.service';
import { Activity } from '../../types/activity.types';
import { ActivityPlayerModalComponent } from '../../components/activities/activity-player-modal/activity-player-modal.component';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-exercises-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    RouterLink,
    ActivityPlayerModalComponent
  ],
  templateUrl: './exercises-list.component.html',
  styleUrls: ['./exercises-list.component.css']
})
export class ExercisesListComponent implements OnInit, OnDestroy {
  activityId: string | null = null;
  numericActivityId: number = 0;
  activity: Partial<Activity> | null = null;
  exercises: Exercise[] = [];
  isLoading = true;
  error: string | null = null;
  displayedColumns: string[] = ['sequenceOrder', 'preview', 'jsonSnippet', 'createdAt', 'actions'];


  // Preview modal state
  isPreviewOpen = false;
  previewExercise: Exercise | null = null;
  previewActivity: Activity | null = null;

  private routeSubscription?: Subscription;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exerciseApiService: ExerciseApiService,
    private activityApiService: ActivityApiService,
    private snackBar: MatSnackBar,
    public languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      this.activityId = params['activityId'];
      this.numericActivityId = this.activityId ? parseInt(this.activityId, 10) : 0;
      if (this.numericActivityId) {
        this.loadData();
      } else {
        this.error = 'No activity ID provided';
        this.isLoading = false;
      }
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
    if (!this.numericActivityId) {
      this.error = 'No activity ID provided';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = null;
    try {
      // Load activity details
      const activityPromise = this.activityApiService.getById(this.numericActivityId).toPromise();
      
      // Load exercises for this activity
      const exercisesPromise = this.exerciseApiService.getByActivityId(this.numericActivityId).toPromise();

      const [activity, exercises] = await Promise.all([activityPromise, exercisesPromise]);

      this.activity = activity as Partial<Activity>;
      this.exercises = (exercises || []).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    } catch (error) {
      console.error('Failed to load exercises:', error);
      this.error = 'Failed to load exercises';
    } finally {
      this.isLoading = false;
    }
  }

  getActivityTitle(): string {
    if (!this.activity?.title) return 'Unknown Activity';
    return this.languageService.getText(this.activity.title) || 'Untitled';
  }


  getJsonSnippet(exercise: Exercise): string {
    try {
      const parsed = JSON.parse(exercise.jsonData);
      const snippet = JSON.stringify(parsed, null, 2);
      return snippet.length > 100 ? snippet.substring(0, 100) + '...' : snippet;
    } catch {
      return 'Invalid JSON';
    }
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  }

  handlePreview(exercise: Exercise): void {
    this.previewExercise = exercise;
    // Convert exercise to activity format for activity-player-modal
    if (this.activity && exercise) {
      this.previewActivity = {
        ...this.activity,
        contentJson: exercise.jsonData, // Use exercise's jsonData as contentJson
      } as Activity;
    }
    this.isPreviewOpen = true;
  }

  closePreview(): void {
    this.isPreviewOpen = false;
    this.previewExercise = null;
    this.previewActivity = null;
  }

  getActivityTypeId(): number {
    return this.activity?.activityTypeId || 0;
  }

  async handleEdit(exercise: Exercise): Promise<void> {
    // Navigate to activity editor with edit mode
    this.router.navigate(['/activity-edit'], {
      queryParams: {
        activityId: this.activityId,
        editExerciseId: exercise.id
      }
    });
  }

  deleteExercise(exercise: Exercise): void {
    if (this.exercises.length <= 1) {
      this.snackBar.open('Cannot delete the last exercise. An activity must have at least one exercise.', 'Close', { duration: 4000 });
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete Exercise #${exercise.sequenceOrder}?`);
    if (!confirmed) return;

    this.exerciseApiService.delete(exercise.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Exercise deleted successfully!', 'Close', { duration: 2000 });
          this.loadData();
        },
        error: (err) => {
          console.error('Failed to delete exercise:', err);
          this.snackBar.open('Failed to delete exercise.', 'Close', { duration: 5000 });
        }
      });
  }

  handleAddExercise(): void {
    // Navigate to activity editor to add new exercise
    this.router.navigate(['/activity-edit'], {
      queryParams: {
        activityId: this.activityId,
        addExercise: true
      }
    });
  }

  goBack(): void {
    const lessonId = this.activity?.lessonId;
    if (lessonId) {
      this.router.navigate(['activities'], { queryParams: { lessonId } });
    } else {
      this.router.navigate(['activities']);
    }
  }
}
