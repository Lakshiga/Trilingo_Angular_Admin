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
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { Observable, Subject, takeUntil } from 'rxjs';
import { ActivityTypeApiService, ActivityTypeResponse, ActivityTypeCreateDto } from '../../../services/activity-type-api.service';
import { MainActivityApiService, MainActivityResponse } from '../../../services/main-activity-api.service';

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
    MatSelectModule,
    MatOptionModule
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
  
  mainActivities: MainActivityResponse[] = [];
  selectedMainActivityId: number | null = null;
  editedMainActivityId: number | null = null;
  
  displayedColumns: string[] = ['id', 'mainActivity', 'name_en', 'name_ta', 'name_si', 'actions'];
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ActivityTypeApiService,
    private mainActivityApiService: MainActivityApiService
  ) {}

  ngOnInit(): void {
    this.loadMainActivities();
    this.loadActivityTypes();
  }

  loadMainActivities(): void {
    this.mainActivityApiService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.mainActivities = data;
        },
        error: (err) => {
          console.error('Error loading main activities:', err);
        }
      });
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
    console.log('startAdding called');
    this.isAdding = true;
    this.selectedMainActivityId = null;
    this.newActivityType = {
      name_en: '',
      name_ta: '',
      name_si: ''
    };
    // Scroll to add row after a short delay to ensure DOM is updated
    setTimeout(() => {
      const addRow = document.querySelector('.add-row');
      if (addRow) {
        addRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }

  startEditing(type: ActivityTypeResponse): void {
    this.editRowId = type.id;
    this.editedMainActivityId = type.mainActivityId;
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
    this.selectedMainActivityId = null;
    this.editedMainActivityId = null;
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
    console.log('createActivityType called', {
      newActivityType: this.newActivityType,
      selectedMainActivityId: this.selectedMainActivityId
    });

    if (!this.newActivityType.name_en && !this.newActivityType.name_ta && !this.newActivityType.name_si) {
      alert('Please enter at least one name (English, Tamil, or Sinhala)');
      return;
    }

    if (!this.selectedMainActivityId || this.selectedMainActivityId <= 0) {
      alert('Please select a Main Activity');
      return;
    }

    const createDto: ActivityTypeCreateDto = {
      name_en: this.newActivityType.name_en || '',
      name_ta: this.newActivityType.name_ta || '',
      name_si: this.newActivityType.name_si || '',
      mainActivityId: this.selectedMainActivityId
    };

    console.log('Creating activity type with DTO:', createDto);

    this.isLoading = true;
    this.error = null;
    this.apiService.create(createDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Activity type created successfully:', response);
          this.cancelEdit();
          this.loadActivityTypes();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error creating activity type:', err);
          console.error('Error details:', JSON.stringify(err, null, 2));
          this.error = err?.error?.message || err?.message || 'Failed to create activity type';
          this.isLoading = false;
          alert(`Failed to create activity type: ${this.error}`);
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

    // Include mainActivityId if it was changed
    if (this.editedMainActivityId !== null && this.editedMainActivityId !== type.mainActivityId) {
      updateDto.mainActivityId = this.editedMainActivityId;
    }

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

  getMainActivityName(mainActivityId: number): string {
    const mainActivity = this.mainActivities.find(ma => ma.id === mainActivityId);
    return mainActivity ? (mainActivity.name_en || mainActivity.name_ta || mainActivity.name_si) : 'N/A';
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