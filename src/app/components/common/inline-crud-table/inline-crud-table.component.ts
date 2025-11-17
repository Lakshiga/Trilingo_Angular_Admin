import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { Observable, Subject, takeUntil } from 'rxjs';

export interface ColumnDef<T, TCreateDto> {
  field: keyof T;
  headerName: string;
  type?: 'string' | 'number';
  renderCell?: (value: any, row: T) => string;
  renderEditCell?: (value: any, onChange: (field: keyof TCreateDto, value: any) => void) => string;
}

export interface CrudApiService<T, TCreateDto> {
  getAll(): Observable<T[]>;
  create(item: TCreateDto): Observable<any>;
  update(id: number | string, item: Partial<TCreateDto>): Observable<any>;
  deleteItem(id: number | string): Observable<any>;
}

@Component({
  selector: 'app-inline-crud-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  templateUrl: './inline-crud-table.component.html',
  styleUrls: ['./inline-crud-table.component.css']
})
export class InlineCrudTableComponent<T extends Record<string, any>, TCreateDto extends object> implements OnInit, OnDestroy {
  @Input() entityName!: string;
  @Input() apiService!: CrudApiService<T, TCreateDto>;
  @Input() columns!: ColumnDef<T, TCreateDto>[];
  @Input() idField!: keyof T;
  @Input() renderCustomActions?: (item: T) => any;

  items: T[] = [];
  isLoading = false;
  editRowId: number | string | null = null;
  editedRowData: Partial<TCreateDto> | null = null;
  isAdding = false;
  newItem: T | null = null;

  displayedColumns: string[] = [];
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.displayedColumns = [...this.columns.map(col => col.field as string), 'actions'];
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isLoading = true;
    this.apiService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.items = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.isLoading = false;
        }
      });
  }

  startEditing(row: T): void {
    this.editRowId = row[this.idField] as number | string;
    this.editedRowData = { ...row } as Partial<TCreateDto>;
  }

  startAdding(): void {
    this.isAdding = true;
    this.newItem = {} as T;
    this.editedRowData = {};
  }

  cancelEdit(): void {
    this.editRowId = null;
    this.editedRowData = null;
    this.isAdding = false;
    this.newItem = null;
  }

  saveRow(row: T): void {
    if (!this.editedRowData) return;

    if (this.isAdding) {
      this.apiService.create(this.editedRowData as TCreateDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cancelEdit();
            this.loadData();
          },
          error: (error: any) => {
            console.error('Error creating data:', error);
          }
        });
    } else {
      this.apiService.update(row[this.idField] as number | string, this.editedRowData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cancelEdit();
            this.loadData();
          },
          error: (error: any) => {
            console.error('Error updating data:', error);
          }
        });
    }
  }

  deleteItem(row: T): void {
    if (confirm(`Are you sure you want to delete this ${this.entityName.toLowerCase()}?`)) {
      this.apiService.deleteItem(row[this.idField] as number | string)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadData();
          },
          error: (error: any) => {
            console.error('Error deleting data:', error);
          }
        });
    }
  }


  getDisplayValue(row: T, column: ColumnDef<T, TCreateDto>): string {
    if (column.renderCell) {
      return column.renderCell(row[column.field], row);
    }
    return String(row[column.field] || '');
  }

  getEditValue(row: T, column: ColumnDef<T, TCreateDto>): any {
    if (this.editedRowData && column.field in this.editedRowData) {
      return this.editedRowData[column.field as keyof TCreateDto];
    }
    return row[column.field] || '';
  }

  getColumnDef(column: ColumnDef<T, TCreateDto>): string {
    return String(column.field);
  }

  onEditValueChange(field: keyof T, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    
    if (!this.editedRowData) {
      this.editedRowData = {};
    }
    
    this.editedRowData[field as keyof TCreateDto] = value as any;
  }
}