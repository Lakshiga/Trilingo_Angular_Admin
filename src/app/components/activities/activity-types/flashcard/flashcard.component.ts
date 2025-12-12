import { Component, Input, ElementRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../../environments/environment';

type Language = 'ta' | 'en' | 'si';
// Defines the structure for fields that support Tamil (ta), English (en), and Sinhalese (si)
export interface MultiLingualText {
  ta: string;
  en: string;
  si: string;
}
// Defines the structure for image URLs - supports both multilingual and default format
export interface ImageUrl {
  default?: string | null;
  ta?: string | null;
  en?: string | null;
  si?: string | null;
}
// Defines the final structure for a single Flashcard Word object
export interface FlashcardWord {
  id: string; 
  
  // If omitted/null, it triggers the simple design (Image 1 look).
  label?: MultiLingualText | null; // Optional Secondary Text (e.g., phonetic spelling)
  // Top title/category (e.g., "உடல் உறுப்புகள்"). Used only in the detailed design.
  referenceTitle?: MultiLingualText | null; 
  imageUrl?: ImageUrl | null; // Optional Image Path
  word: MultiLingualText; // MUST BE PRESENT: The main vocabulary item (e.g., "கண்" or "அ")
  audioUrl: MultiLingualText; // Audio path for each language
}
// Defines the content structure for the entire activity (list of words)
export interface FlashcardContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  words: FlashcardWord[];
}

@Component({
  selector: 'app-flashcard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './flashcard.component.html',
  styleUrls: ['./flashcard.component.css']
})
export class FlashcardComponent implements OnInit {
  @Input() cardData?: FlashcardWord; 
  @Input() content?: FlashcardContent | FlashcardWord | any; 
  @Input() currentLang: Language = 'ta'; // Default language is Tamil
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

  // Check if content is a FlashcardContent object (has words array)
  private isFlashcardContent(obj: any): obj is FlashcardContent {
    return obj && Array.isArray(obj.words);
  }

  // Check if content is a single FlashcardWord object
  private isFlashcardWord(obj: any): obj is FlashcardWord {
    return obj && obj.word && typeof obj.word === 'object' && ('ta' in obj.word || 'en' in obj.word || 'si' in obj.word);
  }

  // Check if there's valid content to display
  get hasContent(): boolean {
    if (this.cardData) return true;
    if (!this.content) return false;
    
    if (this.isFlashcardContent(this.content)) {
      return this.content.words && this.content.words.length > 0;
    }
    if (this.isFlashcardWord(this.content)) {
      return true;
    }
    return false;
  }

  // Get the cardData, handling both FlashcardContent and single FlashcardWord
  get cardDataToUse(): FlashcardWord {
    if (this.cardData) {
      return this.cardData;
    }
    
    if (this.content) {
      // If content is FlashcardContent with words array
      if (this.isFlashcardContent(this.content)) {
        if (this.content.words && this.content.words.length > 0) {
          return this.content.words[0];
        }
      }
      // If content is a single FlashcardWord object (from template/preview)
      else if (this.isFlashcardWord(this.content)) {
        return this.content;
      }
    }
    
    // Return a default empty structure if neither is provided
    return {
      id: '',
      word: { ta: '', en: '', si: '' },
      audioUrl: { ta: '', en: '', si: '' }
    };
  }

  // --- Design Switch Logic ---

  get isDetailedDesign(): boolean {
    // Show detailed layout if we have any of: label, referenceTitle, or image for current / fallback language
    return !!(this.labelToDisplay || this.referenceTitleToDisplay || this.imagePath);
  }

  // --- Data Getters ---

  get referenceTitleToDisplay(): string | null {
    const ref = this.cardDataToUse.referenceTitle;
    if (!ref) return null;
    return ref[this.currentLang] || ref.en || ref.ta || ref.si || null;
  }

  get labelToDisplay(): string | null {
    const lbl = this.cardDataToUse.label;
    if (!lbl) return null;
    return lbl[this.currentLang] || lbl.en || lbl.ta || lbl.si || null;
  }

  get mainWordToDisplay(): string | null {
    const w = this.cardDataToUse.word;
    if (!w) return null;
    return w[this.currentLang] || w.en || w.ta || w.si || null;
  }

  get audioPath(): string | null {
    const url =
      this.cardDataToUse.audioUrl?.[this.currentLang] ||
      this.cardDataToUse.audioUrl?.en ||
      this.cardDataToUse.audioUrl?.ta ||
      this.cardDataToUse.audioUrl?.si ||
      null;
    return this.addMediaBaseUrl(url);
  }

  get imagePath(): string | null {
    if (!this.cardDataToUse.imageUrl) return null;
    
    // Support both multilingual format (ta/en/si) and default format
    const imageUrl = this.cardDataToUse.imageUrl;
    const url =
      imageUrl[this.currentLang] ||
      imageUrl.en ||
      imageUrl.ta ||
      imageUrl.si ||
      imageUrl['default'] ||
      null;
    return this.addMediaBaseUrl(url);
  }

  // --- Core Methods ---

  private addMediaBaseUrl(url: string | null): string | null {
    if (!url) return null;
    // If already absolute, return as is
    if (/^https?:\/\//i.test(url)) return url;
    const base = environment.awsBaseUrl || window.location.origin;
    // If root-relative, prefix with AWS base (fallback to origin)
    if (url.startsWith('/')) return `${base}${url}`;
    // Otherwise treat as relative path under AWS base
    return `${base}/${url}`;
  }

  ngOnInit(): void {
    // Play audio on load
    setTimeout(() => {
      this.playAudio();
    }, 300);
  }

  playAudio(): void {
    const audioSrc = this.audioPath;
    if (audioSrc && this.audioPlayer) {
      this.audioPlayer.nativeElement.src = audioSrc;
      this.audioPlayer.nativeElement.play().catch(e => console.error("Audio playback failed:", e));
    }
  }
}