import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LessonApiService, LessonCreateDto, MultilingualLesson } from '../../services/lesson-api.service';
import { MultilingualText } from '../../types/multilingual.types';
import { MultilingualFormComponent, MultilingualFormData } from '../common/multilingual-form/multilingual-form.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-lessons',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MultilingualFormComponent
  ],
  templateUrl: './lessons.component.html',
  styleUrls: ['./lessons.component.css']
})
export class LessonsComponent implements OnInit {
  lessons: MultilingualLesson[] = [];
  displayedColumns: string[] = ['lessonId', 'lessonName', 'sequenceOrder', 'manageActivities', 'actions'];
  showDialog = false;
  isEditing = false;
  isLoading = false;
  isSaving = false;
  error: string | null = null;
  levelId: number = 1; // Default level ID
  lessonFormData: MultilingualFormData = {
    name_en: '',
    name_ta: '',
    name_si: ''
  };
  editingLessonId: number | null = null;
  
  currentLesson: {
    lessonName: MultilingualText;
    sequenceOrder: number;
    levelId: number;
  } = {
    lessonName: { en: '', ta: '', si: '' },
    sequenceOrder: 0,
    levelId: 1
  };

  constructor(
    private lessonApiService: LessonApiService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get dialogTitle(): string {
    return this.isEditing ? 'Edit Lesson' : 'Add New Lesson';
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const paramId = parseInt(params['levelId'] ?? '1', 10);
      this.levelId = Number.isNaN(paramId) ? 1 : paramId;
      this.loadLessons();
    });
  }

  async loadLessons() {
    this.isLoading = true;
    this.error = null;
    try {
      const lessons = await this.lessonApiService.getLessonsByLevelId(this.levelId).toPromise();
      this.lessons = lessons || [];
    } catch (err) {
      console.error('Error loading lessons:', err);
      this.error = err instanceof Error ? err.message : 'Failed to load lessons';
      this.snackBar.open(this.error, 'Close', { duration: 5000 });
    } finally {
      this.isLoading = false;
    }
  }

  getDisplayText(content: MultilingualText | undefined): string {
    if (!content) return '';
    return content.en || content.ta || content.si || '';
  }

  goBack() {
    try {
      // Navigate back to levels page
      this.router.navigate(['levels']).catch(err => {
        console.error('Navigation error:', err);
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
    return false; // Prevent default anchor behavior
  }

  openAddLessonDialog() {
    this.isEditing = false;
    this.editingLessonId = null;
    this.currentLesson = {
      lessonName: { en: '', ta: '', si: '' },
      sequenceOrder: Math.max(this.lessons.length + 1, 1),
      levelId: this.levelId
    };
    this.lessonFormData = {
      name_en: '',
      name_ta: '',
      name_si: ''
    };
    this.showDialog = true;
  }

  editLesson(lesson: MultilingualLesson) {
    this.isEditing = true;
    this.editingLessonId = lesson.lessonId;
    this.currentLesson = {
      lessonName: lesson.lessonName,
      sequenceOrder: lesson.sequenceOrder,
      levelId: lesson.levelId
    };
    this.lessonFormData = {
      name_en: lesson.lessonName?.en || '',
      name_ta: lesson.lessonName?.ta || '',
      name_si: lesson.lessonName?.si || ''
    };
    this.showDialog = true;
  }

  async deleteLesson(lesson: MultilingualLesson) {
    const lessonName = this.getDisplayText(lesson.lessonName);
    if (confirm(`Are you sure you want to delete "${lessonName}"?`)) {
      try {
        await this.lessonApiService.deleteItem(lesson.lessonId).toPromise();
        this.lessons = this.lessons.filter(l => l.lessonId !== lesson.lessonId);
        this.snackBar.open('Lesson deleted successfully', 'Close', { duration: 3000 });
      } catch (err) {
        console.error('Error deleting lesson:', err);
        this.snackBar.open(
          err instanceof Error ? err.message : 'Failed to delete lesson',
          'Close',
          { duration: 5000 }
        );
      }
    }
  }

  manageActivities(lesson: MultilingualLesson) {
    // Navigate to activities page for this lesson
    this.router.navigate(['/activities'], { queryParams: { lessonId: lesson.lessonId } });
  }

  async saveLesson() {
    const { name_en, name_ta, name_si } = this.lessonFormData;
    if (!name_en && !name_ta && !name_si) {
      this.snackBar.open('Lesson name is required in at least one language', 'Close', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    
    try {
      const lessonName: MultilingualText = {
        en: name_en.trim(),
        ta: name_ta.trim(),
        si: name_si.trim()
      };
      const sequenceOrder = Number(this.currentLesson.sequenceOrder) || 1;

      const createDto: LessonCreateDto = {
        lessonName,
        sequenceOrder,
        levelId: this.currentLesson.levelId
      };

      if (this.isEditing && this.editingLessonId !== null) {
        const updatedLesson = await this.lessonApiService.update(this.editingLessonId, createDto).toPromise();
        if (updatedLesson) {
          const index = this.lessons.findIndex(l => l.lessonId === updatedLesson.lessonId);
          if (index !== -1) {
            this.lessons[index] = updatedLesson;
          }
        }
        this.snackBar.open('Lesson updated successfully', 'Close', { duration: 3000 });
      } else {
        const newLesson = await this.lessonApiService.create(createDto).toPromise();
        if (newLesson) {
          this.lessons.push(newLesson);
          this.snackBar.open('Lesson created successfully', 'Close', { duration: 3000 });
        }
      }
      this.closeDialog();
    } catch (err) {
      console.error('Error saving lesson:', err);
      this.snackBar.open(
        err instanceof Error ? err.message : 'Failed to save lesson',
        'Close',
        { duration: 5000 }
      );
    } finally {
      this.isSaving = false;
    }
  }

  onLessonFormDataChange(value: MultilingualFormData) {
    this.lessonFormData = value;
  }

  closeDialog() {
    this.showDialog = false;
    this.isEditing = false;
    this.editingLessonId = null;
    this.currentLesson = {
      lessonName: { en: '', ta: '', si: '' },
      sequenceOrder: 1,
      levelId: this.levelId
    };
    this.lessonFormData = {
      name_en: '',
      name_ta: '',
      name_si: ''
    };
  }
}