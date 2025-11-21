import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LessonApiService, MultilingualLesson, LessonCreateDto } from '../../services/lesson-api.service';
import { MultilingualText } from '../../types/multilingual.types';
import { MultilingualInputComponent } from '../../components/common/multilingual-input/multilingual-input.component';
import { Subscription, takeUntil, Subject } from 'rxjs';

@Component({
  selector: 'app-lessons',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    RouterLink,
    MultilingualInputComponent
  ],
  templateUrl: './lessons.component.html',
  styleUrls: ['./lessons.component.css']
})
export class LessonsPageComponent implements OnInit, OnDestroy {
  levelId: string | null = null;
  numericLevelId: number = 0;
  lessons: MultilingualLesson[] = [];
  isLoading = false;
  error: string | null = null;
  
  editRowId: number | null = null;
  editedLesson: Partial<LessonCreateDto> | null = null;
  isAdding = false;
  newLesson: Partial<LessonCreateDto> = {};
  
  displayedColumns: string[] = ['sequenceOrder', 'lessonName', 'manageActivities', 'actions'];
  private routeSubscription?: Subscription;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private lessonApiService: LessonApiService
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      this.levelId = params['levelId'];
      this.numericLevelId = this.levelId ? parseInt(this.levelId, 10) : 0;
      if (this.numericLevelId) {
        this.loadLessons();
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

  loadLessons(): void {
    if (!this.numericLevelId) return;
    
    this.isLoading = true;
    this.error = null;
    
    this.lessonApiService.getLessonsByLevelId(this.numericLevelId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lessons) => {
          this.lessons = lessons.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading lessons:', err);
          this.error = 'Failed to load lessons';
          this.isLoading = false;
        }
      });
  }

  startAdding(): void {
    this.isAdding = true;
    this.newLesson = {
      lessonName: { en: '', ta: '', si: '' } as MultilingualText,
      sequenceOrder: this.lessons.length > 0 ? Math.max(...this.lessons.map(l => l.sequenceOrder)) + 1 : 1
    };
  }

  startEditing(lesson: MultilingualLesson): void {
    this.editRowId = lesson.lessonId;
    this.editedLesson = {
      lessonName: { ...lesson.lessonName },
      sequenceOrder: lesson.sequenceOrder
    };
  }

  cancelEdit(): void {
    this.editRowId = null;
    this.editedLesson = null;
    this.isAdding = false;
    this.newLesson = {};
  }

  saveLesson(lesson?: MultilingualLesson): void {
    if (this.isAdding) {
      this.createLesson();
    } else if (lesson && this.editedLesson) {
      this.updateLesson(lesson);
    }
  }

  createLesson(): void {
    if (!this.newLesson.lessonName || !this.newLesson.sequenceOrder) {
      return;
    }

    const createDto: LessonCreateDto = {
      levelId: this.numericLevelId,
      lessonName: this.newLesson.lessonName,
      sequenceOrder: this.newLesson.sequenceOrder
    };

    this.isLoading = true;
    this.lessonApiService.create(createDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.loadLessons();
        },
        error: (err) => {
          console.error('Error creating lesson:', err);
          this.error = 'Failed to create lesson';
          this.isLoading = false;
        }
      });
  }

  updateLesson(lesson: MultilingualLesson): void {
    if (!this.editedLesson) return;

    this.isLoading = true;
    this.lessonApiService.update(lesson.lessonId, this.editedLesson)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.loadLessons();
        },
        error: (err) => {
          console.error('Error updating lesson:', err);
          this.error = 'Failed to update lesson';
          this.isLoading = false;
        }
      });
  }

  deleteLesson(lesson: MultilingualLesson): void {
    if (!confirm(`Are you sure you want to delete this lesson?`)) {
      return;
    }

    this.isLoading = true;
    this.lessonApiService.deleteItem(lesson.lessonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadLessons();
        },
        error: (err) => {
          console.error('Error deleting lesson:', err);
          this.error = 'Failed to delete lesson';
          this.isLoading = false;
        }
      });
  }

  onNewLessonNameChange(value: MultilingualText): void {
    this.newLesson.lessonName = value;
  }

  onNewLessonNameFieldChange(field: 'en' | 'ta' | 'si', value: string): void {
    if (!this.newLesson.lessonName) {
      this.newLesson.lessonName = { en: '', ta: '', si: '' };
    }
    this.newLesson.lessonName[field] = value;
  }

  onEditedLessonNameChange(value: MultilingualText): void {
    if (this.editedLesson) {
      this.editedLesson.lessonName = value;
    }
  }

  getLessonDisplayName(lesson: MultilingualLesson): string {
    return lesson.lessonName?.en || lesson.lessonName?.ta || lesson.lessonName?.si || 'Untitled Lesson';
  }

  goBackToLevels(): void {
    this.router.navigate(['levels']);
  }
}