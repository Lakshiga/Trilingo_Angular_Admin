import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Activity } from '../../../types/activity.types';
import { ActivityRendererComponent } from '../activity-renderer/activity-renderer.component';

@Component({
  selector: 'app-activity-player-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    ActivityRendererComponent
  ],
  templateUrl: './activity-player-modal.component.html',
  styleUrls: ['./activity-player-modal.component.css']
})
export class ActivityPlayerModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() activity: Activity | null = null;
  @Input() isLoading: boolean = false;
  // Keep backwards compatibility: expose both event names
  @Output() close = new EventEmitter<void>();
  @Output('onClose') onCloseEvent = new EventEmitter<void>();

  device: 'phone' | 'tablet' = 'phone';
  currentExerciseIndex: number = 0;
  exercises: any[] = [];

  get isActivityPaginated(): boolean {
    return this.exercises.length > 1;
  }

  get currentExerciseData(): any {
    return this.exercises[this.currentExerciseIndex] || {};
  }

  ngOnInit(): void {
    this.parseExercises();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.currentExerciseIndex = 0;
    }
    if (changes['activity']) {
      this.parseExercises();
    }
  }

  private parseExercises(): void {
    if (!this.activity?.contentJson) {
      this.exercises = [];
      return;
    }

    try {
      const parsedContent = JSON.parse(this.activity.contentJson);
      this.exercises = Array.isArray(parsedContent) ? parsedContent : [parsedContent];
    } catch {
      this.exercises = [{ error: "Invalid Activity JSON format." }];
    }
  }

  onDeviceChange(event: any): void {
    this.device = event.value;
  }

  getDeviceStyles(): string {
    const styles = this.device === 'phone' 
      ? 'width: 375px; height: 667px;' 
      : 'width: 540px; height: 720px;';
    return styles;
  }

  goToNextExercise(): void {
    this.currentExerciseIndex = Math.min(this.currentExerciseIndex + 1, this.exercises.length - 1);
  }

  goToPrevExercise(): void {
    this.currentExerciseIndex = Math.max(this.currentExerciseIndex - 1, 0);
  }

  onClose(): void {
    // Emit both so parents listening to either will receive the event
    this.close.emit();
    this.onCloseEvent.emit();
  }
}