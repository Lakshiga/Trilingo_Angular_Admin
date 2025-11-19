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
import { LevelApiService, LevelResponse, LevelCreateDto } from '../../../services/level-api.service';
import { MultilingualText } from '../../../types/multilingual.types';
import { MultilingualInputComponent } from '../multilingual-input/multilingual-input.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-levels-table',
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
    MultilingualInputComponent,
    RouterLink
  ],
  templateUrl: './levels-table.component.html',
  styleUrls: ['./levels-table.component.css']
})
export class LevelsTableComponent implements OnInit, OnDestroy {
  levels: LevelResponse[] = [];
  isLoading = false;
  error: string | null = null;
  
  editRowId: number | null = null;
  editedLevel: Partial<LevelCreateDto> | null = null;
  isAdding = false;
  newLevel: Partial<LevelCreateDto> = {};
  selectedLanguageId: number = 1; // Default language
  
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

  loadData(): void {
    this.isLoading = true;
    this.error = null;
    
    this.levelApiService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (levels) => {
          this.levels = levels;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading levels:', err);
          this.error = 'Failed to load levels';
          this.isLoading = false;
        }
      });
  }

  startAdding(): void {
    this.isAdding = true;
    this.newLevel = {
      name_en: '',
      name_ta: '',
      name_si: '',
      languageId: this.selectedLanguageId
    };
  }

  startEditing(level: LevelResponse): void {
    this.editRowId = level.id;
    this.selectedLanguageId = level.languageId ?? 1;
    this.editedLevel = {
      name_en: level.name_en,
      name_ta: level.name_ta,
      name_si: level.name_si,
      languageId: level.languageId
    };
  }

  cancelEdit(): void {
    this.editRowId = null;
    this.editedLevel = null;
    this.isAdding = false;
    this.newLevel = {};
  }

  saveLevel(level?: LevelResponse): void {
    if (this.isAdding) {
      this.createLevel();
    } else if (level && this.editedLevel) {
      this.updateLevel(level);
    }
  }

  createLevel(): void {
    if (!this.newLevel.name_en && !this.newLevel.name_ta && !this.newLevel.name_si) {
      return;
    }

    const createDto: LevelCreateDto = {
      name_en: this.newLevel.name_en || '',
      name_ta: this.newLevel.name_ta || '',
      name_si: this.newLevel.name_si || '',
      languageId: this.selectedLanguageId
    };

    this.isLoading = true;
    this.levelApiService.create(createDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.loadData();
        },
        error: (err) => {
          console.error('Error creating level:', err);
          this.error = 'Failed to create level';
          this.isLoading = false;
        }
      });
  }

  updateLevel(level: LevelResponse): void {
    if (!this.editedLevel) return;

    const updateDto: Partial<LevelCreateDto> = {
      name_en: this.editedLevel.name_en,
      name_ta: this.editedLevel.name_ta,
      name_si: this.editedLevel.name_si,
      languageId: this.editedLevel.languageId
    };

    this.isLoading = true;
    this.levelApiService.update(level.id, updateDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.loadData();
        },
        error: (err) => {
          console.error('Error updating level:', err);
          this.error = 'Failed to update level';
          this.isLoading = false;
        }
      });
  }

  deleteLevel(level: LevelResponse): void {
    if (!confirm(`Are you sure you want to delete this level?`)) {
      return;
    }

    this.isLoading = true;
    this.levelApiService.deleteItem(level.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadData();
        },
        error: (err) => {
          console.error('Error deleting level:', err);
          this.error = 'Failed to delete level';
          this.isLoading = false;
        }
      });
  }

}