import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MultilingualText, LanguageCode, SUPPORTED_LANGUAGES } from '../../../types/multilingual.types';

@Component({
  selector: 'app-multilingual-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './multilingual-input.component.html',
  styleUrls: ['./multilingual-input.component.css']
})
export class MultilingualInputComponent implements OnInit {
  @Input() value: MultilingualText = { ta: '', en: '', si: '' };
  @Input() label: string = 'Text';
  @Input() placeholder: MultilingualText = { ta: '', en: '', si: '' };
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() showCompletionIndicator: boolean = true;
  @Input() currentLanguage: LanguageCode = 'en';

  @Output() valueChange = new EventEmitter<MultilingualText>();

  languages = SUPPORTED_LANGUAGES;

  ngOnInit() {
    // Initialize with empty values if not provided
    if (!this.value) {
      this.value = { ta: '', en: '', si: '' };
    }
  }

  getValue(languageCode: LanguageCode): string {
    return this.value[languageCode] || '';
  }

  onInputChange(event: Event, languageCode: LanguageCode): void {
    const target = event.target as HTMLInputElement;
    const newValue = { ...this.value, [languageCode]: target.value };
    this.value = newValue;
    this.valueChange.emit(newValue);
  }

  onTabChange(event: any): void {
    // Optional: Handle tab change if needed
  }

  getLanguageLabel(code: LanguageCode): string {
    const language = this.languages.find(lang => lang.code === code);
    return language ? `${language.flag} ${language.nativeName}` : code.toUpperCase();
  }

  getPlaceholder(code: LanguageCode): string {
    return this.placeholder[code] || `Enter ${this.label.toLowerCase()} in ${this.getLanguageLabel(code)}`;
  }

  hasContent(code: LanguageCode): boolean {
    return !!(this.value[code] && this.value[code].trim());
  }

  getCompletionText(): string {
    const completedCount = this.languages.filter(lang => this.hasContent(lang.code)).length;
    const totalCount = this.languages.length;
    return `${completedCount}/${totalCount} languages completed`;
  }
}
