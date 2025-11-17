import { MultilingualText } from './multilingual.types';

export interface ActivityType {
  activityTypeId: number;
  activityName: string;
  title?: MultilingualText;
  description?: MultilingualText;
  
}
