import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ExerciseApiService, Exercise } from '../../services/exercise-api.service';
import { ActivityApiService } from '../../services/activity-api.service';
import { Activity } from '../../types/activity.types';
import { ActivityPlayerModalComponent } from '../../components/activities/activity-player-modal/activity-player-modal.component';

@Component({
  selector: 'app-exercises-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    ActivityPlayerModalComponent
  ],
  templateUrl: './exercises-list.component.html',
  styleUrls: ['./exercises-list.component.css']
})
export class ExercisesListComponent implements OnInit, OnDestroy {
  activityId: string | null = null;
  activity: Partial<Activity> | null = null;
  exercises: Exercise[] = [];
  isLoading = true;
  displayedColumns: string[] = ['sequenceOrder', 'preview', 'jsonSnippet', 'createdAt', 'actions'];

  // Preview modal state
  isPreviewOpen = false;
  previewExercise: Exercise | null = null;
  previewActivity: Activity | null = null;

  private routeSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exerciseApiService: ExerciseApiService,
    private activityApiService: ActivityApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      this.activityId = params['activityId'];
      if (this.activityId) {
        this.loadData();
      } else {
        this.snackBar.open('No activity ID provided', 'Close', { duration: 3000 });
        this.router.navigate(['/activities']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  private async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      // Load activity details
      const activityPromise = this.activityApiService.getById(parseInt(this.activityId!, 10)).toPromise();
      
      // Load exercises for this activity
      const exercisesPromise = this.exerciseApiService.getByActivityId(parseInt(this.activityId!, 10)).toPromise();

      const [activity, exercises] = await Promise.all([activityPromise, exercisesPromise]);

      this.activity = activity as Partial<Activity>;
      this.exercises = (exercises || []) as Exercise[];
      
      // Sort by sequence order
      this.exercises.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    } catch (error) {
      console.error('Failed to load exercises:', error);
      this.snackBar.open('Failed to load exercises', 'Close', { duration: 5000 });
    } finally {
      this.isLoading = false;
    }
  }

  getActivityTitle(): string {
    if (!this.activity?.title) return 'Unknown Activity';
    return this.activity.title.en || this.activity.title.ta || this.activity.title.si || 'Untitled';
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

  async handleDelete(exercise: Exercise): Promise<void> {
    if (this.exercises.length <= 1) {
      this.snackBar.open('Cannot delete the last exercise. An activity must have at least one exercise.', 'Close', { duration: 4000 });
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete Exercise #${exercise.sequenceOrder}?`);
    if (!confirmed) return;

    try {
      await this.exerciseApiService.delete(exercise.id).toPromise();
      this.exercises = this.exercises.filter(ex => ex.id !== exercise.id);
      this.snackBar.open('Exercise deleted successfully!', 'Close', { duration: 2000 });
      
      // Reload to refresh sequence numbers
      await this.loadData();
    } catch (error) {
      console.error('Failed to delete exercise:', error);
      this.snackBar.open('Failed to delete exercise.', 'Close', { duration: 5000 });
    }
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
