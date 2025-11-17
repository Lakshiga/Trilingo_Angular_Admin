import { Component, Input, signal, computed, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

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
export class ScrumbleActivityComponent { // Class name set to App for root component

  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';

  // --- Game State Signals ---
  currentSlots = signal<Slot[]>([]);      // Slots containing placed tiles
  availableTiles = signal<Tile[]>([]);    // Tiles yet to be placed
  
  // Dragging state
  draggedTile = signal<{ letter: string, originalIndex: number } | null>(null);
  
  // Feedback state
  feedback = signal<'default' | 'correct' | 'incorrect'>('default');

  // --- Computed Values ---
  currentTask = computed(() => this.content?.taskData || null);

  constructor() {
    effect(() => {
        // Initialize game when task data changes or loads
        const task = this.currentTask();
        if (task) {
            this.initializeGame();
        }
    }, { allowSignalWrites: true });
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
    return multiLingual[this.currentLang] || multiLingual['en'] || 'N/A';
  }

  getAnswerText(): string {
    return this.text(this.currentTask()?.answer)?.toUpperCase() || '';
  }

  getScrambledLetters(): string[] {
    const scrambled = this.currentTask()?.scrambled;
    if (!scrambled) return [];
    
    const lettersString = scrambled[this.currentLang] || scrambled['ta'] || [];
    // Assumes scrambled content is an array of strings in JSON, but our interface is MultiLingualText, 
    // so we handle it as a string array or comma-separated string depending on what the user enters in the Admin Form.
    // Based on the JSON example: ["ப்", "ஆ", "ள்", "பி"]
    if (Array.isArray(lettersString)) {
        return lettersString as string[];
    }
    // Simple fallback if the JSON tool encodes it as a string like "ப்,ஆ,ள்,பி"
    return lettersString.split(/[\s,]+/); 
  }
  
  playSound(audioUrl: MultiLingualText | undefined): void {
      if (!audioUrl) return;
      const path = audioUrl[this.currentLang] || audioUrl['en'] || '';
      if (path) {
          const audio = new Audio(path);
          audio.play().catch(e => console.error("Audio playback failed:", e));
      }
  }
}