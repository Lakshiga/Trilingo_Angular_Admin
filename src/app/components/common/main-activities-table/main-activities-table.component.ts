import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, Subject, takeUntil } from 'rxjs';
import { MainActivityApiService, MainActivityResponse, MainActivityCreateDto } from '../../../services/main-activity-api.service';
import { MultilingualFormComponent, MultilingualFormData } from '../multilingual-form/multilingual-form.component';

@Component({
  selector: 'app-main-activities-table',
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
  templateUrl: './main-activities-table.component.html',
  styleUrls: ['./main-activities-table.component.css']
})
export class MainActivitiesTableComponent implements OnInit, OnDestroy {
  activities: MainActivityResponse[] = [];
  isLoading = false;
  showDialog = false;
  dialogMode: 'add' | 'edit' = 'add';
  currentActivity: MainActivityResponse | null = null;
  
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

  get dialogTitle(): string {
    return this.dialogMode === 'add' ? 'Add Main Activity' : 'Edit Main Activity';
  }

  loadActivities(): void {
    this.isLoading = true;
    this.apiService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.activities = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading activities:', error);
          this.isLoading = false;
        }
      });
  }

  openAddDialog(): void {
    this.dialogMode = 'add';
    this.currentActivity = null;
    this.showDialog = true;
  }

  openEditDialog(activity: MainActivityResponse): void {
    this.dialogMode = 'edit';
    this.currentActivity = activity;
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.currentActivity = null;
  }

  onSave(formData: MultilingualFormData): void {
    const createDto: MainActivityCreateDto = {
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
            this.loadActivities();
          },
          error: (error) => {
            console.error('Error creating main activity:', error);
          }
        });
    } else if (this.dialogMode === 'edit' && this.currentActivity) {
      this.apiService.update(this.currentActivity.id, createDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.closeDialog();
            this.loadActivities();
          },
          error: (error) => {
            console.error('Error updating main activity:', error);
          }
        });
    }
  }

  deleteActivity(activity: MainActivityResponse): void {
    if (confirm(`Are you sure you want to delete "${activity.name_en}"?`)) {
      this.apiService.deleteItem(activity.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadActivities();
          },
          error: (error) => {
            console.error('Error deleting main activity:', error);
          }
        });
    }
  }
}