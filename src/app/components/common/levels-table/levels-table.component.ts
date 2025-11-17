import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Observable, Subject, takeUntil } from 'rxjs';
import { LevelApiService, LevelResponse, LevelCreateDto } from '../../../services/level-api.service';
import { LanguageApiService, LanguageResponse } from '../../../services/language-api.service';
import { MultilingualFormComponent, MultilingualFormData } from '../multilingual-form/multilingual-form.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-levels-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MultilingualFormComponent,
    RouterLink
  ],
  templateUrl: './levels-table.component.html',
  styleUrls: ['./levels-table.component.css']
})
export class LevelsTableComponent implements OnInit, OnDestroy {
  levels: LevelResponse[] = [];
  isLoading = false;
  showDialog = false;
  dialogMode: 'add' | 'edit' = 'add';
  currentLevel: LevelResponse | null = null;
  selectedLanguageId: number = 1; // Default language (hidden from UI)
  currentFormData: MultilingualFormData = {
    name_en: '',
    name_ta: '',
    name_si: ''
  };
  
  displayedColumns: string[] = ['id', 'name_en', 'name_ta', 'name_si', 'manageLessons', 'actions'];
  private destroy$ = new Subject<void>();

  constructor(
    private levelApiService: LevelApiService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get dialogTitle(): string {
    return this.dialogMode === 'add' ? 'Add Level' : 'Edit Level';
  }

  loadData(): void {
    this.isLoading = true;
    this.levelApiService.getAll().toPromise()
      .then(levels => {
        this.levels = levels || [];
        this.isLoading = false;
      })
      .catch(error => {
        console.error('Error loading data:', error);
        this.isLoading = false;
      });
  }

  openAddDialog(): void {
    this.dialogMode = 'add';
    this.currentLevel = null;
    this.currentFormData = {
      name_en: '',
      name_ta: '',
      name_si: ''
    };
    this.showDialog = true;
  }

  openEditDialog(level: LevelResponse): void {
    this.dialogMode = 'edit';
    this.currentLevel = level;
    // Keep existing languageId internally but do not expose selector
    this.selectedLanguageId = level.languageId ?? 1;
    this.currentFormData = {
      name_en: level.name_en,
      name_ta: level.name_ta,
      name_si: level.name_si
    };
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.currentLevel = null;
  }

  onFormDataChange(formData: MultilingualFormData): void {
    this.currentFormData = formData;
  }

  isFormValid(): boolean {
    return !!(this.currentFormData.name_en || this.currentFormData.name_ta || this.currentFormData.name_si);
  }

  onSave(): void {
    if (!this.isFormValid()) {
      return;
    }

    const createDto: LevelCreateDto = {
      name_en: this.currentFormData.name_en,
      name_ta: this.currentFormData.name_ta,
      name_si: this.currentFormData.name_si,
      languageId: this.selectedLanguageId
    };

    if (this.dialogMode === 'add') {
      this.levelApiService.create(createDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.closeDialog();
            this.loadData();
          },
          error: (error) => {
            console.error('Error creating level:', error);
          }
        });
    } else if (this.dialogMode === 'edit' && this.currentLevel) {
      this.levelApiService.update(this.currentLevel.id, createDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.closeDialog();
            this.loadData();
          },
          error: (error) => {
            console.error('Error updating level:', error);
          }
        });
    }
  }

  deleteLevel(level: LevelResponse): void {
    if (confirm(`Are you sure you want to delete "${level.name_en}"?`)) {
      this.levelApiService.deleteItem(level.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadData();
          },
          error: (error) => {
            console.error('Error deleting level:', error);
          }
        });
    }
  }
}