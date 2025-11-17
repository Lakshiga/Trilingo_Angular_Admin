// Multilingual support types for Trillingo application
// Supporting Tamil (ta), English (en), and Sinhala (si)

export type LanguageCode = 'ta' | 'en' | 'si';

export interface MultilingualText {
  ta: string; // Tamil
  en: string; // English  
  si: string; // Sinhala
}

export interface MultilingualAudio {
  ta?: string; // Tamil audio URL
  en?: string; // English audio URL
  si?: string; // Sinhala audio URL
}

export interface MultilingualImage {
  ta?: string; // Tamil-specific image URL
  en?: string; // English-specific image URL
  si?: string; // Sinhala-specific image URL
  default?: string; // Default image URL (fallback)
}

// Language configuration
export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇱🇰',
    rtl: false
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false
  },
  {
    code: 'si',
    name: 'Sinhala',
    nativeName: 'සිංහල',
    flag: '🇱🇰',
    rtl: false
  }
];

// Utility functions for multilingual content
export class MultilingualUtils {
  static getText(content: MultilingualText, language: LanguageCode): string {
    return content[language] || content.en || content.ta || content.si || '';
  }

  static getAudio(content: MultilingualAudio, language: LanguageCode): string | undefined {
    return content[language] || content.en || content.ta || content.si;
  }

  static getImage(content: MultilingualImage, language: LanguageCode): string | undefined {
    return content[language] || content.default;
  }

  static createMultilingualText(ta: string, en: string, si: string): MultilingualText {
    return { ta, en, si };
  }

  static createMultilingualAudio(ta?: string, en?: string, si?: string): MultilingualAudio {
    return { ta, en, si };
  }

  static isEmpty(content: MultilingualText): boolean {
    return !content.ta && !content.en && !content.si;
  }

  static hasContent(content: MultilingualText, language: LanguageCode): boolean {
    return !!(content[language] && content[language].trim());
  }
}
