import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

// --- Interfaces (Data Model) ---

type CardType = 'text' | 'image' | 'audio';
type Language = 'ta' | 'en' | 'si';

interface MultiLingualText { [key: string]: string; }
interface CardContent { [key: string]: string | null; }

interface Card {
  id: string; 
  matchId: string; 
  side: 'A' | 'B'; 
  type: CardType;
  content: CardContent;
}

interface ActivityContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  cards: Card[]; 
}

// --- Component Definition ---

@Component({
  selector: 'app-matching',
  // Using material components for a clean admin UI
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, 
    MatInputModule, MatSelectModule, MatIconModule, MatCardModule
  ],
  standalone: true,
  templateUrl: './matching.component.html',
  styleUrls: ['./matching.component.css']
})
export class AppMatchingAdminForm implements OnInit {
  // Input: DB-லிருந்து வரும் JSON Object
  @Input() activityData?: ActivityContent;
  // Input: Alternative input name for compatibility with activity-renderer
  @Input() content?: ActivityContent;
  // Output: சேமிப்பதற்காக Parent Component-க்கு JSON String-ஐ அனுப்பும்
  @Output() saveActivity = new EventEmitter<string>();

  activityForm!: FormGroup;
  languages: Language[] = ['ta', 'en', 'si'];
  cardTypes: CardType[] = ['text', 'image', 'audio'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
    const data = this.activityData || this.content;
    if (data) {
      this.patchForm(data);
    }
  }

  // --- Form Structure Initialization ---

  initializeForm(): void {
    this.activityForm = this.fb.group({
      // Title and Instruction are generally MultiLingual
      title_ta: ['', Validators.required],
      title_en: [''],
      title_si: [''],
      instruction_ta: ['', Validators.required],
      instruction_en: [''],
      instruction_si: [''],
      // FormArray holds the list of Cards
      cards: this.fb.array([])
    });
  }

  // Helper to get the cards FormArray
  get cardsArray(): FormArray {
    return this.activityForm.get('cards') as FormArray;
  }

  // Creates a FormGroup for a single Card item
  private createCardGroup(card?: Card): FormGroup {
    const isImage = card?.type === 'image';
    const isAudio = card?.type === 'audio';
    const isText = card?.type === 'text';

    return this.fb.group({
      id: [card?.id || this.generateId('A'), Validators.required], // Unique ID (e.g., A1, B1)
      matchId: [card?.matchId || this.generateId('P'), Validators.required], // Matching Key (e.g., P1, P2)
      side: [card?.side || 'A', Validators.required], // Side (A or B)
      type: [card?.type || 'text', Validators.required], // Content Type (text/image/audio)

      // --- Content Fields (Conditional Validation based on Type) ---
      
      // Image/Audio Path (default path for media)
      content_default: [card?.content['default'] || '', isImage || isAudio ? Validators.required : null],
      
      // Text Content (for Text or Audio description in different languages)
      content_ta: [card?.content['ta'] || '', isText || isAudio ? Validators.required : null],
      content_en: [card?.content['en'] || '', isText || isAudio ? Validators.required : null],
      content_si: [card?.content['si'] || '', isText || isAudio ? Validators.required : null],
    });
  }
  
  // Dynamically updates validation rules when card type changes
  updateCardValidation(group: AbstractControl): void {
    const formGroup = group as FormGroup;
    const type = formGroup.get('type')?.value;
    const isText = type === 'text';
    const isImage = type === 'image';
    const isAudio = type === 'audio';

    // Reset all validators
    ['content_default', 'content_ta', 'content_en', 'content_si'].forEach(controlName => {
        formGroup.get(controlName)?.clearValidators();
    });

    // Apply new validators based on the selected type
    if (isImage || isAudio) {
        formGroup.get('content_default')?.setValidators(Validators.required);
    }
    if (isText || isAudio) { 
        // Text is required if type is text, or if type is audio (for description/label)
        formGroup.get('content_ta')?.setValidators(Validators.required);
    }

    // Update validity
    ['content_default', 'content_ta', 'content_en', 'content_si'].forEach(controlName => {
        formGroup.get(controlName)?.updateValueAndValidity();
    });
  }


  // --- Data Loading and Saving ---

  // Load existing data into the form
  private patchForm(data: ActivityContent): void {
    // Patch Header fields
    this.activityForm.patchValue({
        title_ta: data.title['ta'],
        title_en: data.title['en'],
        title_si: data.title['si'],
        instruction_ta: data.instruction['ta'],
        instruction_en: data.instruction['en'],
        instruction_si: data.instruction['si'],
    });

    // Patch Card Array
    data.cards.forEach(card => {
        const cardGroup = this.createCardGroup(card);
        this.cardsArray.push(cardGroup);
    });
  }
  
  // Add a new card to the list
  addCard(): void {
    // Get the match ID of the last pair or generate a new one
    const lastMatchId = this.cardsArray.controls.length > 0 
        ? this.cardsArray.controls[this.cardsArray.controls.length - 1].get('matchId')?.value 
        : this.generateId('P');
        
    // Check if the previous card was side A. If so, default the new one to side B, otherwise default to A.
    let targetSide: 'A' | 'B' = 'A';
    if (this.cardsArray.length > 0) {
        const lastCardSide = this.cardsArray.controls[this.cardsArray.length - 1].get('side')?.value;
        targetSide = (lastCardSide === 'A' ? 'B' : 'A');
    }
    
    const newId = this.generateId(targetSide);
    
    const newGroup = this.fb.group({
        id: [newId, Validators.required],
        matchId: [lastMatchId, Validators.required],
        side: [targetSide, Validators.required],
        type: ['text', Validators.required],
        content_default: [''],
        content_ta: ['', Validators.required],
        content_en: [''],
        content_si: [''],
    });

    this.cardsArray.push(newGroup);
  }

  removeCard(index: number): void {
    this.cardsArray.removeAt(index);
  }

  // Transforms the FormGroup data back into the final ActivityContent JSON format
  private formatDataForSave(formData: any): ActivityContent {
    const cards: Card[] = formData.cards.map((card: any) => ({
      id: card.id,
      matchId: card.matchId,
      side: card.side,
      type: card.type,
      content: {
        default: card.content_default || null,
        ta: card.content_ta || null,
        en: card.content_en || null,
        si: card.content_si || null,
      },
    }));

    return {
      title: { ta: formData.title_ta, en: formData.title_en, si: formData.title_si },
      instruction: { ta: formData.instruction_ta, en: formData.instruction_en, si: formData.instruction_si },
      cards: cards,
    };
  }

  // Handler for the Save button
  onSubmit(): void {
    if (this.activityForm.valid) {
      const formattedData = this.formatDataForSave(this.activityForm.value);
      // Emit the final JSON string to the parent component for saving to DB
      this.saveActivity.emit(JSON.stringify(formattedData, null, 2));
    } else {
      // Mark all fields as touched to display validation errors
      this.activityForm.markAllAsTouched();
      console.error('Form is invalid. Please check required fields.');
    }
  }
  
  // Simple ID generator for matchId and cardId
  private generateId(prefix: 'P' | 'A' | 'B'): string {
      return `${prefix}${Date.now() % 1000}${Math.floor(Math.random() * 100)}`;
  }

  // --- Preview Methods (FIXED) ---

  // Get preview data from current form
  getPreviewData(): ActivityContent | null {
    try {
      return this.formatDataForSave(this.activityForm.value);
    } catch (e) {
      return null;
    }
  }

  // Get cards for Side A (Returns control values as expected by HTML)
  getSideACards(): any[] {
    if (!this.cardsArray) return [];
    return this.cardsArray.controls
      .filter(control => control.get('side')?.value === 'A')
      .map(control => control.value);
  }

  // Get cards for Side B (Returns control values as expected by HTML)
  getSideBCards(): any[] {
    if (!this.cardsArray) return [];
    return this.cardsArray.controls
      .filter(control => control.get('side')?.value === 'B')
      .map(control => control.value);
  }

  // Get title for preview (English priority)
  getPreviewTitle(): string {
    return this.activityForm.get('title_en')?.value || 
           this.activityForm.get('title_ta')?.value || 
           'Activity Title';
  }

  // Get instruction for preview (English priority)
  getPreviewInstruction(): string {
    return this.activityForm.get('instruction_en')?.value || 
           this.activityForm.get('instruction_ta')?.value || 
           'Activity Instructions';
  }

  // Get card content for display (Text/Label, English priority)
  getCardDisplayContent(card: any): string {
    // card object contains content_ta, content_en, etc. directly
    if (card.type === 'text' || card.type === 'audio') {
      return card.content_en || card.content_ta || card.content_si || '';
    }
    // For image, display the path as the label
    if (card.type === 'image') {
      return card.content_default || 'Image File';
    }
    return '';
  }

  // Get card media URL
  getCardMediaUrl(card: any): string | null {
    if (card.type === 'image' || card.type === 'audio') {
      return card.content_default || null;
    }
    return null;
  }
}