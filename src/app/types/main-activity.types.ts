import { MultilingualText } from './multilingual.types';

export interface MainActivity {
  id: number;
  name: string;
  title?: MultilingualText;
  description?: MultilingualText;
}
