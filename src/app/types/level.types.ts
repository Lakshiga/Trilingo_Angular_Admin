import { MultilingualText } from './multilingual.types';

export interface Level {
  levelId: number;
  levelName: string;
  description: string | null;
  sequenceOrder: number;
  slug: string;
  imageUrl: string;
  title?: MultilingualText;
  multilingualDescription?: MultilingualText;
}