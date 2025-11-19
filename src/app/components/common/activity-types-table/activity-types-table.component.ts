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
import { ActivityTypeApiService, ActivityTypeResponse, ActivityTypeCreateDto } from '../../../services/activity-type-api.service';
import { MultilingualText } from '../../../types/multilingual.types';
import { MultilingualInputComponent } from '../multilingual-input/multilingual-input.component';

@Component({
  selector: 'app-activity-types-table',
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
    MultilingualInputComponent
  ],
  templateUrl: './activity-types-table.component.html',
  styleUrls: ['./activity-types-table.component.css']
})
export class ActivityTypesTableComponent implements OnInit, OnDestroy {
  activityTypes: ActivityTypeResponse[] = [];
  isLoading = false;
  error: string | null = null;
  
  editRowId: number | null = null;
  editedActivityType: Partial<ActivityTypeCreateDto> | null = null;
  isAdding = false;
  newActivityType: Partial<ActivityTypeCreateDto> = {};
  
  displayedColumns: string[] = ['id', 'name_en', 'name_ta', 'name_si', 'actions'];
  private destroy$ = new Subject<void>();

  constructor(private apiService: ActivityTypeApiService) {}

  ngOnInit(): void {
    this.loadActivityTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActivityTypes(): void {
    this.isLoading = true;
    this.error = null;
    
    this.apiService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.activityTypes = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading activity types:', err);
          this.error = 'Failed to load activity types';
          this.isLoading = false;
        }
      });
  }

  startAdding(): void {
    this.isAdding = true;
    this.newActivityType = {
      name_en: '',
      name_ta: '',
      name_si: ''
    };
  }

  startEditing(type: ActivityTypeResponse): void {
    this.editRowId = type.id;
    this.editedActivityType = {
      name_en: type.name_en,
      name_ta: type.name_ta,
      name_si: type.name_si
    };
  }

  cancelEdit(): void {
    this.editRowId = null;
    this.editedActivityType = null;
    this.isAdding = false;
    this.newActivityType = {};
  }

  saveActivityType(type?: ActivityTypeResponse): void {
    if (this.isAdding) {
      this.createActivityType();
    } else if (type && this.editedActivityType) {
      this.updateActivityType(type);
    }
  }

  createActivityType(): void {
    if (!this.newActivityType.name_en && !this.newActivityType.name_ta && !this.newActivityType.name_si) {
      return;
    }

    const createDto: ActivityTypeCreateDto = {
      name_en: this.newActivityType.name_en || '',
      name_ta: this.newActivityType.name_ta || '',
      name_si: this.newActivityType.name_si || ''
    };

    this.isLoading = true;
    this.apiService.create(createDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.loadActivityTypes();
        },
        error: (err) => {
          console.error('Error creating activity type:', err);
          this.error = 'Failed to create activity type';
          this.isLoading = false;
        }
      });
  }

  updateActivityType(type: ActivityTypeResponse): void {
    if (!this.editedActivityType) return;

    const updateDto: Partial<ActivityTypeCreateDto> = {
      name_en: this.editedActivityType.name_en,
      name_ta: this.editedActivityType.name_ta,
      name_si: this.editedActivityType.name_si
    };

    this.isLoading = true;
    this.apiService.update(type.id, updateDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.loadActivityTypes();
        },
        error: (err) => {
          console.error('Error updating activity type:', err);
          this.error = 'Failed to update activity type';
          this.isLoading = false;
        }
      });
  }

  deleteActivityType(type: ActivityTypeResponse): void {
    if (!confirm(`Are you sure you want to delete this activity type?`)) {
      return;
    }

    this.isLoading = true;
    this.apiService.deleteItem(type.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadActivityTypes();
        },
        error: (err) => {
          console.error('Error deleting activity type:', err);
          this.error = 'Failed to delete activity type';
          this.isLoading = false;
        }
      });
  }

}