import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
// MatTypographyModule is not available in Angular Material v19
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { DependentInlineCrudTableComponent } from '../../components/common/dependent-inline-crud-table/dependent-inline-crud-table.component';
import { LessonApiService } from '../../services/lesson-api.service';
import { Lesson } from '../../types/lesson.types';
import { MultilingualText } from '../../types/multilingual.types';
import { Subscription } from 'rxjs';

interface LessonCreateDto {
  lessonName: MultilingualText;
  sequenceOrder: number;
  levelId: number;
}

@Component({
  selector: 'app-lessons',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterLink,
    DependentInlineCrudTableComponent
  ],
  templateUrl: './lessons.component.html',
  styleUrls: ['./lessons.component.css']
})
export class LessonsPageComponent implements OnInit, OnDestroy {
  levelId: string | null = null;
  apiService: any = null;
  private routeSubscription?: Subscription;

  columns = [
    { field: 'lessonName' as keyof Lesson, headerName: 'Lesson Name', type: 'string' as const },
    { field: 'sequenceOrder' as keyof Lesson, headerName: 'Sequence Order', type: 'number' as const }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private lessonApiService: LessonApiService
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      this.levelId = params['levelId'];
      this.setupApiService();
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  private setupApiService(): void {
    if (!this.levelId) {
      this.apiService = null;
      return;
    }

    const numericLevelId = parseInt(this.levelId, 10);
    this.apiService = {
      getAllByParentId: () => this.lessonApiService.getLessonsByLevelId(numericLevelId),
      create: (newItem: LessonCreateDto) => this.lessonApiService.create({ 
        ...newItem, 
        levelId: numericLevelId
      }),
      update: (id: number, item: Partial<LessonCreateDto>) => this.lessonApiService.update(id, item),
      deleteItem: (id: number) => this.lessonApiService.deleteItem(id)
    };
  }

  renderCustomLessonActions = (lesson: Lesson) => {
    return `<a mat-button routerLink="/activities" [queryParams]="{lessonId: ${lesson.lessonId}}" class="manage-activities-btn">
      Manage Activities
    </a>`;
  };

  goBackToLevels(): void {
    this.router.navigate(['levels']);
  }
}