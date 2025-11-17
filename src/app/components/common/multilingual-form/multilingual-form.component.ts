import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../../../types/multilingual.types';

export interface MultilingualFormData {
  name_en: string;
  name_ta: string;
  name_si: string;
  description_en?: string;
  description_ta?: string;
  description_si?: string;
}

@Component({
  selector: 'app-multilingual-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './multilingual-form.component.html',
  styleUrls: ['./multilingual-form.component.css']
})
export class MultilingualFormComponent implements OnInit {
  @Input() title: string = 'Add Item';
  @Input() fieldLabel: string = 'Name';
  @Input() descriptionLabel: string = 'Description';
  @Input() showDescription: boolean = false;
  @Input() showActions: boolean = true;
  @Input() saveButtonText: string = 'Save';
  @Input() initialData: Partial<MultilingualFormData> = {};
  
  @Output() save = new EventEmitter<MultilingualFormData>();
  @Output() cancel = new EventEmitter<void>();
  @Output() dataChange = new EventEmitter<MultilingualFormData>();

  languages = SUPPORTED_LANGUAGES;
  
  formData: MultilingualFormData = {
    name_en: '',
    name_ta: '',
    name_si: '',
    description_en: '',
    description_ta: '',
    description_si: ''
  };

  ngOnInit(): void {
    if (this.initialData) {
      this.formData = {
        name_en: this.initialData.name_en || '',
        name_ta: this.initialData.name_ta || '',
        name_si: this.initialData.name_si || '',
        description_en: this.initialData.description_en || '',
        description_ta: this.initialData.description_ta || '',
        description_si: this.initialData.description_si || ''
      };
    }
  }

  onFieldChange(): void {
    this.dataChange.emit(this.formData);
  }

  isFieldComplete(langCode: LanguageCode): boolean {
    const fieldName = langCode === 'ta' ? 'name_ta' : langCode === 'si' ? 'name_si' : 'name_en';
    return !!(this.formData[fieldName] && this.formData[fieldName].trim());
  }

  isDescriptionComplete(langCode: LanguageCode): boolean {
    if (!this.showDescription) return true;
    const fieldName = langCode === 'ta' ? 'description_ta' : langCode === 'si' ? 'description_si' : 'description_en';
    return !!(this.formData[fieldName as keyof MultilingualFormData] && 
              this.formData[fieldName as keyof MultilingualFormData]?.trim());
  }

  getCompletionText(): string {
    const completed = this.languages.filter(lang => this.isFieldComplete(lang.code)).length;
    return `${completed}/${this.languages.length} languages completed`;
  }

  getDescriptionCompletionText(): string {
    if (!this.showDescription) return 'N/A';
    const completed = this.languages.filter(lang => this.isDescriptionComplete(lang.code)).length;
    return `${completed}/${this.languages.length} languages completed`;
  }

  isFormValid(): boolean {
    return this.languages.every(lang => this.isFieldComplete(lang.code));
  }

  onSave(): void {
    if (this.isFormValid()) {
      this.save.emit(this.formData);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
