import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Activity } from '../../../types/activity.types';
import { MainActivity } from '../../../types/main-activity.types';
import { ActivityType } from '../../../types/activity-type.types';
import { MultilingualText } from '../../../types/multilingual.types';
import { MultilingualInputComponent } from '../../common/multilingual-input/multilingual-input.component';

@Component({
  selector: 'app-activity-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MultilingualInputComponent
  ],
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.css']
})
export class ActivityFormComponent {
  @Input() activityData: Partial<Activity> = {};
  @Input() mainActivities: MainActivity[] = [];
  @Input() activityTypes: ActivityType[] = [];
  @Output() dataChange = new EventEmitter<Partial<Activity>>();

  onDataChange(): void {
    // console.log('Activity form data changed:', this.activityData);
    this.dataChange.emit({ ...this.activityData });
  }

  onMainActivityChange(event: any): void {
    const mainActivityId = Number(event?.value || event?.target?.value);
    // Ensure we have a valid main activity ID
    if (mainActivityId && mainActivityId > 0) {
      this.activityData.mainActivityId = mainActivityId;
      // console.log('Main activity changed:', mainActivityId);
      this.onDataChange();
    } else {
      // If the main activity is invalid, set it to 0 or null
      this.activityData.mainActivityId = mainActivityId || 0;
      this.onDataChange();
    }
  }

  onActivityTypeChange(event: any): void {
    const activityTypeId = Number(event?.value || event?.target?.value);
    // Ensure we have a valid activity type ID
    if (activityTypeId && activityTypeId > 0) {
      this.activityData.activityTypeId = activityTypeId;
      // console.log('Activity type changed:', activityTypeId);
      this.onDataChange();
    } else {
      // If the activity type is invalid, set it to 0 or null
      this.activityData.activityTypeId = activityTypeId || 0;
      this.onDataChange();
    }
  }

  getTitleValue(): MultilingualText {
    return this.activityData.title || { ta: '', en: '', si: '' };
  }

  getTitlePlaceholder(): MultilingualText {
    return {
      ta: 'செயல்பாட்டின் தலைப்பை உள்ளிடவும்',
      en: 'Enter activity title',
      si: 'ක්‍රියාකාරකමේ මාතෘකාව ඇතුළත් කරන්න'
    };
  }

  onTitleChange(newTitle: MultilingualText): void {
    // Ensure we're creating a new object reference to trigger change detection
    const updatedTitle = { ...newTitle };
    this.activityData = { ...this.activityData, title: updatedTitle };
    this.onDataChange();
  }
}