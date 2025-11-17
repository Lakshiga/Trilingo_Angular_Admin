import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// MatTypographyModule is not available in Angular Material v19
import { MatCardModule } from '@angular/material/card';

export interface ColumnDef<T> {
  field: keyof T;
  headerName: string;
  type?: 'string' | 'number';
}

export interface DependentCrudApiService<T, TCreateDto> {
  getAllByParentId(parentId: number | string): Promise<T[]>;
  create(data: TCreateDto): Promise<T>;
  update(id: number | string, data: Partial<TCreateDto>): Promise<T>;
  delete(id: number | string): Promise<void>;
}

@Component({
  selector: 'app-dependent-inline-crud-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  templateUrl: './dependent-inline-crud-table.component.html',
  styleUrls: ['./dependent-inline-crud-table.component.css']
})
export class DependentInlineCrudTableComponent<T extends Record<string, any>, TCreateDto extends object> 
  implements OnInit, OnChanges {
  
  @Input() entityName!: string;
  @Input() parentName?: string;
  @Input() parentRoute!: string;
  @Input() parentId!: number | string;
  @Input() apiService!: DependentCrudApiService<T, TCreateDto>;
  @Input() columns!: ColumnDef<T>[];
  @Input() idField!: keyof T;
  @Input() renderCustomActions?: (item: T) => any;
  @Input() initialData?: T[];

  items: T[] = [];
  isLoading = true;
  editRowId: number | string | null = null;
  editedRowData: Partial<TCreateDto> | null = null;
  isAdding = false;

  get dataSource(): T[] {
    return this.isAdding ? [...this.items, {} as T] : this.items;
  }

  get displayedColumns(): string[] {
    const cols = ['id', ...this.columns.map(c => String(c.field)), 'actions'];
    return this.isAdding ? [...cols, 'addRow'] : cols;
  }

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.fetchData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['parentId'] || changes['apiService']) {
      this.fetchData();
    }
  }

  private async fetchData(): Promise<void> {
    if (this.initialData && this.items.length > 0) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    try {
      const data = await this.apiService.getAllByParentId(this.parentId);
      this.items = data;
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  startEditing(item: T): void {
    this.editRowId = item[this.idField];
    const initialEditData: Partial<TCreateDto> = {};
    this.columns.forEach(col => {
      (initialEditData as any)[col.field] = item[col.field];
    });
    this.editedRowData = initialEditData;
  }

  cancelEdit(): void {
    this.editRowId = null;
    this.editedRowData = null;
    this.isAdding = false;
  }

  async saveEdit(): Promise<void> {
    if (!this.editRowId || !this.editedRowData) return;
    
    try {
      await this.apiService.update(this.editRowId, this.editedRowData);
      this.cancelEdit();
      await this.fetchData();
    } catch (error) {
      console.error(error);
    }
  }

  startAdding(): void {
    this.isAdding = true;
    const initialAddData: Partial<TCreateDto> = {};
    this.columns.forEach(col => {
      (initialAddData as any)[col.field] = col.type === 'number' ? 0 : '';
    });
    this.editedRowData = initialAddData;
  }

  cancelAdd(): void {
    this.isAdding = false;
    this.editedRowData = null;
  }

  async saveAdd(): Promise<void> {
    if (!this.editedRowData) return;
    
    try {
      await this.apiService.create(this.editedRowData as TCreateDto);
      this.cancelAdd();
      await this.fetchData();
    } catch (error) {
      console.error(error);
    }
  }

  async deleteItem(id: number | string): Promise<void> {
    if (confirm(`Are you sure you want to delete this ${this.entityName}?`)) {
      try {
        await this.apiService.delete(id);
        await this.fetchData();
      } catch (error) {
        console.error(error);
      }
    }
  }

  onInputChange(field: keyof T, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    const column = this.columns.find(c => c.field === field);
    const parsedValue = column?.type === 'number' ? parseInt(value, 10) || 0 : value;
    
    if (this.editedRowData) {
      (this.editedRowData as any)[field] = parsedValue;
    }
  }

  isEditing(id: number | string): boolean {
    return this.editRowId === id;
  }

  getEditedValue(field: keyof T): any {
    return (this.editedRowData as any)?.[field] ?? '';
  }

  navigateBack(): void {
    try {
      if (this.parentRoute) {
        // Remove leading slash for navigate - it expects route segments
        const routePath = this.parentRoute.startsWith('/') 
          ? this.parentRoute.substring(1) 
          : this.parentRoute;
        // Split by '/' to handle nested routes properly
        const routeSegments = routePath.split('/').filter(segment => segment.length > 0);
        if (routeSegments.length > 0) {
          this.router.navigate(routeSegments).catch(err => {
            console.error('Navigation error:', err);
            // Fallback to levels if navigation fails
            this.router.navigate(['levels']);
          });
        } else {
          this.router.navigate(['levels']);
        }
      } else {
        // Fallback to levels if no parent route specified
        this.router.navigate(['levels']);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to levels page
      this.router.navigate(['levels']);
    }
  }

  getColumnDef(field: keyof T): string {
    return String(field);
  }
}