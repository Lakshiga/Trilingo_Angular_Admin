import { Component, Input, signal, computed, effect, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { LanguageService } from '../../../../services/language.service';
import { Subscription } from 'rxjs';

// --- Interfaces ---

type Language = 'ta' | 'en' | 'si';

interface MultiLingualText { [key: string]: string; }

interface HintData {
  hintText: MultiLingualText;
  hintImageUrl?: string;
  hintAudioUrl?: MultiLingualText;
}

interface Tile {
    letter: string;
    originalIndex: number; // Index in the scrambled array
}

interface Slot {
    letter: string | null;
    tileOriginalIndex: number | null; // Original index of the tile placed here
}

interface TaskData {
  taskId: string;
  type: string;
  hint: HintData;
  scrambled: MultiLingualText; // Array of letters based on language
  answer: MultiLingualText;
}

interface ActivityContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  taskData: TaskData;
}

// --- Component Definition ---

@Component({
  selector: 'app-scrumble-activity', // MUST be 'app-root' for single component apps
  imports: [CommonModule, MatButtonModule, MatIconModule],
  standalone: true,
   templateUrl: './scrumble-activity.component.html',
  styleUrl: './scrumble-activity.component.css'
})
export class ScrumbleActivityComponent implements OnInit, OnDestroy { // Class name set to App for root component

  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';

  // --- Game State Signals ---
  currentSlots = signal<Slot[]>([]);      // Slots containing placed tiles
  availableTiles = signal<Tile[]>([]);    // Tiles yet to be placed
  
  // Dragging state
  draggedTile = signal<{ letter: string, originalIndex: number } | null>(null);
  
  // Feedback state
  feedback = signal<'default' | 'correct' | 'incorrect'>('default');
  private langSub?: Subscription;

  // --- Computed Values ---
  currentTask = computed(() => this.content?.taskData || null);

  constructor(
    private languageService: LanguageService,
    private sanitizer: DomSanitizer
  ) {
    effect(() => {
        // Initialize game when task data changes or loads
        const task = this.currentTask();
        if (task) {
            this.initializeGame();
        }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // When language changes, rebuild state so hint/letters/answer switch immediately
    this.langSub = this.languageService.currentLanguage$.subscribe(lang => {
      this.currentLang = lang;
      this.initializeGame();
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  // --- Initialization Logic ---

  initializeGame(): void {
    this.feedback.set('default');
    const task = this.currentTask();
    if (!task) return;

    const answerLength = this.getAnswerText().length;
    const scrambledLetters = this.getScrambledLetters();

    // 1. Create empty slots based on answer length
    const initialSlots: Slot[] = Array(answerLength).fill(0).map(() => ({
        letter: null,
        tileOriginalIndex: null
    }));
    this.currentSlots.set(initialSlots);

    // 2. Create tiles from scrambled letters
    const initialTiles: Tile[] = scrambledLetters.map((letter, index) => ({
        letter: letter,
        originalIndex: index // Use array index as unique identifier for source tiles
    }));
    this.availableTiles.set(initialTiles);
  }
  
  // --- Tile Management & Drag-and-Drop ---

  handleDragStart(event: DragEvent, letter: string, originalIndex: number): void {
    this.draggedTile.set({ letter, originalIndex });
    event.dataTransfer?.setData('text/plain', JSON.stringify({ letter, originalIndex }));
    const target = event.currentTarget as HTMLElement;
    target?.classList.add('dragging');
  }

  handleDragEnd(event: DragEvent): void {
    this.draggedTile.set(null);
    const target = event.currentTarget as HTMLElement;
    target?.classList.remove('dragging');
  }

  handleDragOver(event: DragEvent): void {
    event.preventDefault(); // Necessary to allow drop
    const target = event.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  handleDragLeave(event: DragEvent): void {
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  handleDrop(event: DragEvent, slotIndex: number): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    const data = JSON.parse(event.dataTransfer?.getData('text/plain') || '{}');
    const { letter, originalIndex } = data;

    if (letter && originalIndex !== undefined) {
      this.placeTile(slotIndex, letter, originalIndex);
    }
  }

  // Click handler to place tile into the next available slot
  addTileToNextSlot(letter: string, originalIndex: number): void {
      if (this.feedback() !== 'default') return;

      const nextEmptyIndex = this.currentSlots().findIndex(s => s.letter === null);
      if (nextEmptyIndex !== -1) {
        this.placeTile(nextEmptyIndex, letter, originalIndex);
      }
  }

  placeTile(slotIndex: number, letter: string, originalIndex: number): void {
    // 1. Check if the target slot is empty and game is active
    const slots = this.currentSlots();
    if (slots[slotIndex].letter !== null || this.feedback() !== 'default') {
        return; 
    }

    // 2. Update the slot
    this.currentSlots.update(arr => arr.map((slot, index) => 
        index === slotIndex ? { letter, tileOriginalIndex: originalIndex } : slot
    ));

    // 3. Remove tile from available list
    this.availableTiles.update(arr => arr.filter(t => t.originalIndex !== originalIndex));
  }

  removeTile(slotIndex: number): void {
    const slots = this.currentSlots();
    const removedSlot = slots[slotIndex];

    if (removedSlot.letter === null || this.feedback() !== 'default') return;

    // 1. Add tile back to available list
    this.availableTiles.update(arr => [
        ...arr, 
        { letter: removedSlot.letter!, originalIndex: removedSlot.tileOriginalIndex! }
    ].sort((a, b) => a.originalIndex - b.originalIndex)); // Sort back by original index

    // 2. Clear the slot
    this.currentSlots.update(arr => arr.map((slot, index) => 
        index === slotIndex ? { letter: null, tileOriginalIndex: null } : slot
    ));
  }
  
  // --- Game Controls ---

  isAllSlotsFilled = computed(() => this.currentSlots().every(s => s.letter !== null));

  checkAnswer(): void {
    if (this.feedback() !== 'default' || !this.isAllSlotsFilled()) return;

    const currentWord = this.currentSlots().map(s => s.letter).join('');
    const correctAnswer = this.getAnswerText();

    if (currentWord === correctAnswer) {
        this.feedback.set('correct');
        // Success logic (e.g., scoring, next question trigger)
    } else {
        this.feedback.set('incorrect');
    }
  }

  resetGame(): void {
    this.initializeGame();
  }
  
  // --- Content Getters ---

  text(multiLingual: MultiLingualText | undefined): string {
    if (!multiLingual) return 'N/A';
    return (
      multiLingual[this.currentLang] ||
      multiLingual['en'] ||
      multiLingual['ta'] ||
      multiLingual['si'] ||
      'N/A'
    );
  }

  getAnswerText(): string {
    return this.text(this.currentTask()?.answer)?.toUpperCase() || '';
  }

  getScrambledLetters(): string[] {
    const scrambled = this.currentTask()?.scrambled;
    if (!scrambled) return [];
    
    const lettersString =
      scrambled[this.currentLang] ||
      scrambled['en'] ||
      scrambled['ta'] ||
      scrambled['si'] ||
      [];

    if (Array.isArray(lettersString)) {
        return lettersString as string[];
    }
    return String(lettersString).split(/[\s,]+/); 
  }
  
  // Hint helpers
  getHintText(): string {
    const hint = this.currentTask()?.hint?.hintText;
    if (!hint) return 'N/A';
    return (
      hint[this.currentLang] ||
      hint['en'] ||
      hint['ta'] ||
      hint['si'] ||
      'N/A'
    );
  }

  getHintImage(): string | undefined {
    const url = this.currentTask()?.hint?.hintImageUrl;
    if (!url) return undefined;
    return this.languageService.resolveUrl(url) || url;
  }

  getHintAudio(): SafeUrl | null {
    const audioUrl = this.currentTask()?.hint?.hintAudioUrl;
    if (!audioUrl) return null;
    const path =
      audioUrl[this.currentLang] ||
      audioUrl['en'] ||
      audioUrl['ta'] ||
      audioUrl['si'] ||
      '';
    if (!path) return null;
    const resolved = this.languageService.resolveUrl(path) || path;
    return this.sanitizer.bypassSecurityTrustUrl(resolved);
  }

  playSound(audioUrl: MultiLingualText | undefined): void {
      if (!audioUrl) return;
      const path =
        audioUrl[this.currentLang] ||
        audioUrl['en'] ||
        audioUrl['ta'] ||
        audioUrl['si'] ||
        '';
      if (path) {
          const resolved = this.languageService.resolveUrl(path) || path;
          const audio = new Audio(resolved);
          audio.play().catch(e => console.error("Audio playback failed:", e));
      }
  }
}