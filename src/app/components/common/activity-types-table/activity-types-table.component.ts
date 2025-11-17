import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, Subject, takeUntil } from 'rxjs';
import { ActivityTypeApiService, ActivityTypeResponse, ActivityTypeCreateDto } from '../../../services/activity-type-api.service';
import { MultilingualFormComponent, MultilingualFormData } from '../multilingual-form/multilingual-form.component';

@Component({
  selector: 'app-activity-types-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MultilingualFormComponent
  ],
  templateUrl: './activity-types-table.component.html',
  styleUrls: ['./activity-types-table.component.css']
})
export class ActivityTypesTableComponent implements OnInit, OnDestroy {
  activityTypes: ActivityTypeResponse[] = [];
  isLoading = false;
  showDialog = false;
  dialogMode: 'add' | 'edit' = 'add';
  currentActivityType: ActivityTypeResponse | null = null;
  
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

  get dialogTitle(): string {
    return this.dialogMode === 'add' ? 'Add Activity Type' : 'Edit Activity Type';
  }

  loadActivityTypes(): void {
    this.isLoading = true;
    this.apiService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.activityTypes = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading activity types:', error);
          this.isLoading = false;
        }
      });
  }

  openAddDialog(): void {
    this.dialogMode = 'add';
    this.currentActivityType = null;
    this.showDialog = true;
  }

  openEditDialog(type: ActivityTypeResponse): void {
    this.dialogMode = 'edit';
    this.currentActivityType = type;
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.currentActivityType = null;
  }

  onSave(formData: MultilingualFormData): void {
    const createDto: ActivityTypeCreateDto = {
      name_en: formData.name_en,
      name_ta: formData.name_ta,
      name_si: formData.name_si
    };

    if (this.dialogMode === 'add') {
      this.apiService.create(createDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.closeDialog();
            this.loadActivityTypes();
          },
          error: (error) => {
            console.error('Error creating activity type:', error);
          }
        });
    } else if (this.dialogMode === 'edit' && this.currentActivityType) {
      this.apiService.update(this.currentActivityType.id, createDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.closeDialog();
            this.loadActivityTypes();
          },
          error: (error) => {
            console.error('Error updating activity type:', error);
          }
        });
    }
  }

  deleteActivityType(type: ActivityTypeResponse): void {
    if (confirm(`Are you sure you want to delete "${type.name_en}"?`)) {
      this.apiService.deleteItem(type.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadActivityTypes();
          },
          error: (error) => {
            console.error('Error deleting activity type:', error);
          }
        });
    }
  }
}