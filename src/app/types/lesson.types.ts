import { Level } from './level.types';
import { MultilingualText } from './multilingual.types';

export interface Lesson {
  lessonId: number;
  levelId: number;
  lessonName: string;
  description: string | null;
  sequenceOrder: number;
  slug: string;
  level?: Level; // Optional navigation property
  title?: MultilingualText;
  multilingualDescription?: MultilingualText;
}