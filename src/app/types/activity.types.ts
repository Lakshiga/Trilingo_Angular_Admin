import { ActivityType } from './activity-type.types';
import { MainActivity } from './main-activity.types';
import { MultilingualText } from './multilingual.types';

export interface Activity {
  activityId: number;
  lessonId: number;
  title: MultilingualText; // Changed from string to MultilingualText
  sequenceOrder: number;
  activityTypeId: number;
  mainActivityId: number;
  contentJson: string;
  
  // Optional navigation properties for display purposes
  activityType?: ActivityType; 
  mainActivity?: MainActivity;
}
