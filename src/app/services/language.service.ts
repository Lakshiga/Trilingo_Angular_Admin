import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LanguageCode, LanguageConfig, SUPPORTED_LANGUAGES, MultilingualText, MultilingualUtils } from '../types/multilingual.types';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguageSubject = new BehaviorSubject<LanguageCode>('en');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  constructor() {
    // Initialize with saved language preference or default to English
    const savedLanguage = localStorage.getItem('trillingo-language') as LanguageCode;
    if (savedLanguage && this.isValidLanguageCode(savedLanguage)) {
      this.setLanguage(savedLanguage);
    } else {
      this.setLanguage('en');
    }
  }

  getCurrentLanguage(): LanguageCode {
    return this.currentLanguageSubject.value;
  }

  setLanguage(language: LanguageCode): void {
    if (this.isValidLanguageCode(language)) {
      this.currentLanguageSubject.next(language);
      localStorage.setItem('trillingo-language', language);
    }
  }

  getSupportedLanguages(): LanguageConfig[] {
    return SUPPORTED_LANGUAGES;
  }

  getLanguageConfig(code: LanguageCode): LanguageConfig | undefined {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  }

  getText(content: MultilingualText, language?: LanguageCode): string {
    const targetLanguage = language || this.getCurrentLanguage();
    return MultilingualUtils.getText(content, targetLanguage);
  }

  getAudio(content: any, language?: LanguageCode): string | undefined {
    const targetLanguage = language || this.getCurrentLanguage();
    return MultilingualUtils.getAudio(content, targetLanguage);
  }

  getImage(content: any, language?: LanguageCode): string | undefined {
    const targetLanguage = language || this.getCurrentLanguage();
    return MultilingualUtils.getImage(content, targetLanguage);
  }

  private isValidLanguageCode(code: string): code is LanguageCode {
    return ['ta', 'en', 'si'].includes(code);
  }

  // Utility methods for admin panel
  getLanguageDisplayName(code: LanguageCode): string {
    const config = this.getLanguageConfig(code);
    return config ? `${config.flag} ${config.nativeName}` : code.toUpperCase();
  }

  getLanguageShortName(code: LanguageCode): string {
    const config = this.getLanguageConfig(code);
    return config ? config.nativeName : code.toUpperCase();
  }

  // Method to check if content exists for a specific language
  hasContentForLanguage(content: MultilingualText, language: LanguageCode): boolean {
    return MultilingualUtils.hasContent(content, language);
  }

  // Method to get all languages that have content
  getLanguagesWithContent(content: MultilingualText): LanguageCode[] {
    return (['ta', 'en', 'si'] as LanguageCode[]).filter(lang => 
      this.hasContentForLanguage(content, lang)
    );
  }
}
