import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, Subject, takeUntil } from 'rxjs';
import { MainActivityApiService, MainActivityResponse, MainActivityCreateDto } from '../../../services/main-activity-api.service';
import { MultilingualText } from '../../../types/multilingual.types';
import { MultilingualInputComponent } from '../multilingual-input/multilingual-input.component';

@Component({
  selector: 'app-main-activities-table',
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
    MatTooltipModule
  ],
  templateUrl: './main-activities-table.component.html',
  styleUrls: ['./main-activities-table.component.css']
})
export class MainActivitiesTableComponent implements OnInit, OnDestroy {
  activities: MainActivityResponse[] = [];
  isLoading = false;
  error: string | null = null;
  
  editRowId: number | null = null;
  editedActivity: Partial<MainActivityCreateDto> | null = null;
  isAdding = false;
  newActivity: Partial<MainActivityCreateDto> = {};
  
  displayedColumns: string[] = ['id', 'name_en', 'name_ta', 'name_si', 'actions'];
  private destroy$ = new Subject<void>();

  constructor(private apiService: MainActivityApiService) {}

  ngOnInit(): void {
    this.loadActivities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActivities(): void {
    this.isLoading = true;
    this.error = null;
    
    this.apiService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.activities = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading activities:', err);
          this.error = 'Failed to load main activities';
          this.isLoading = false;
        }
      });
  }

  startAdding(): void {
    this.isAdding = true;
    this.newActivity = {
      name_en: '',
      name_ta: '',
      name_si: ''
    };
  }

  startEditing(activity: MainActivityResponse): void {
    this.editRowId = activity.id;
    this.editedActivity = {
      name_en: activity.name_en,
      name_ta: activity.name_ta,
      name_si: activity.name_si
    };
  }

  cancelEdit(): void {
    this.editRowId = null;
    this.editedActivity = null;
    this.isAdding = false;
    this.newActivity = {};
  }

  saveActivity(activity?: MainActivityResponse): void {
    if (this.isAdding) {
      this.createActivity();
    } else if (activity && this.editedActivity) {
      this.updateActivity(activity);
    }
  }

  createActivity(): void {
    if (!this.newActivity.name_en && !this.newActivity.name_ta && !this.newActivity.name_si) {
      return;
    }

    const createDto: MainActivityCreateDto = {
      name_en: this.newActivity.name_en || '',
      name_ta: this.newActivity.name_ta || '',
      name_si: this.newActivity.name_si || ''
    };

    this.isLoading = true;
    this.apiService.create(createDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.loadActivities();
        },
        error: (err) => {
          console.error('Error creating main activity:', err);
          this.error = 'Failed to create main activity';
          this.isLoading = false;
        }
      });
  }

  updateActivity(activity: MainActivityResponse): void {
    if (!this.editedActivity) return;

    const updateDto: Partial<MainActivityCreateDto> = {
      name_en: this.editedActivity.name_en,
      name_ta: this.editedActivity.name_ta,
      name_si: this.editedActivity.name_si
    };

    this.isLoading = true;
    this.apiService.update(activity.id, updateDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.loadActivities();
        },
        error: (err) => {
          console.error('Error updating main activity:', err);
          this.error = 'Failed to update main activity';
          this.isLoading = false;
        }
      });
  }

  deleteActivity(activity: MainActivityResponse): void {
    if (!confirm(`Are you sure you want to delete this main activity?`)) {
      return;
    }

    this.isLoading = true;
    this.apiService.deleteItem(activity.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadActivities();
        },
        error: (err) => {
          console.error('Error deleting main activity:', err);
          this.error = 'Failed to delete main activity';
          this.isLoading = false;
        }
      });
  }

}