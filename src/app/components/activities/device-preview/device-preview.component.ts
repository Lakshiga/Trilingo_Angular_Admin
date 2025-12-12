import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Activity } from '../../../types/activity.types';
import { LanguageService } from '../../../services/language.service';
import { LanguageCode } from '../../../types/multilingual.types';
import { Subscription } from 'rxjs';
import { ActivityRendererComponent } from '../activity-renderer/activity-renderer.component';

@Component({
  selector: 'app-device-preview',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatCardModule,
    ActivityRendererComponent
  ],
  templateUrl: './device-preview.component.html',
  styleUrls: ['./device-preview.component.css']
})
export class DevicePreviewComponent implements OnInit, OnChanges, OnDestroy {
  @Input() activityData: Partial<Activity> = {};

  device: 'phone' | 'tablet' = 'phone';
  orientation: 'portrait' | 'landscape' = 'portrait';
  private langSub?: Subscription;

  constructor(public languageService: LanguageService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // When language changes, force change detection so preview updates
    this.langSub = this.languageService.currentLanguage$.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // console.log('Device preview data changed:', changes);
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  get parsedContent(): any {
    if (!this.activityData.contentJson) {
      return null;
    }

    try {
      const parsed = JSON.parse(this.activityData.contentJson);
      // If it's an array, use the first element, otherwise use the object directly
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed[0] : null;
      }
      return parsed;
    } catch (e) {
      console.error('Error parsing JSON content:', e);
      return { error: 'Invalid JSON' };
    }
  }

  // Ensure we forward a numeric type id to the renderer
  get numericActivityTypeId(): number {
    const raw = (this.activityData as any)?.activityTypeId;
    const n = Number(raw || 0);
    return isNaN(n) ? 0 : n;
  }

  onDeviceChange(event: any): void {
    this.device = event.value;
  }

  onOrientationChange(event: any): void {
    this.orientation = event.value;
  }

  getFrameStyles(): string {
    const deviceDimensions = {
      phone: { width: 375, height: 667 },
      tablet: { width: 540, height: 720 }
    };

    const currentDimensions = deviceDimensions[this.device];
    const isLandscape = this.orientation === 'landscape';

    const width = isLandscape ? currentDimensions.height : currentDimensions.width;
    const height = isLandscape ? currentDimensions.width : currentDimensions.height;

    return `width: ${width}px; height: ${height}px;`;
  }
  
  // Check if we have valid data to display
  get hasValidData(): boolean {
    return !!(this.numericActivityTypeId > 0 && this.parsedContent && !this.parsedContent.error);
  }

  // Multilingual helpers
  get languages() {
    return this.languageService.getSupportedLanguages();
  }

  get currentLanguage(): LanguageCode {
    return this.languageService.getCurrentLanguage();
  }

  setLanguage(code: LanguageCode): void {
    this.languageService.setLanguage(code);
  }
}