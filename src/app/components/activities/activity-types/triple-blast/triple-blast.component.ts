import { Component, Input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// --- Interfaces ---

type Language = 'ta' | 'en' | 'si';

interface MultiLingualText { [key: string]: string; }

interface TileContent { [key: string]: string | null; }

// டைல் வடிவம் (JSON -> data[])
interface Tile {
  id: string; // U1, U2, U3... (Unique ID for rendering and tracking)
  content: TileContent;
}

// விடை வடிவம் (JSON -> answers[])
interface AnswerGroup {
  groupId: string;
  tileIds: string[]; // [U1, U2, U3]
}

interface ActivityContent {
  activityId: string;
  title: MultiLingualText;
  instruction: MultiLingualText;
  contentType: string;
  data: Tile[];
  answers: AnswerGroup[];
}

interface GameTile extends Tile {
  status: 'default' | 'selected' | 'hidden' | 'matched_temp' | 'incorrect_temp';
}

// --- Component Definition ---

@Component({
  selector: 'app-triple-blast', // MUST be 'app-root' for single component apps
  imports: [CommonModule, MatButtonModule, MatIconModule],
  standalone: true,
 templateUrl: './triple-blast.component.html',
  styleUrl: './triple-blast.component.css'
})
export class TripleBlastComponent {
  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';

  // --- Game State Signals ---
  tiles = signal<GameTile[]>([]);
  selectedTileIds = signal<string[]>([]);
  score = signal(0);
  feedbackMessage = signal('');

  // --- Computed Values ---

  // Check if the game is won
  isGameWon = computed(() => this.tiles().every(t => t.status === 'hidden'));
  
  // Get the actual selected tile objects
  selectedTiles = computed(() => this.tiles().filter(t => t.status === 'selected'));

  constructor() {
    effect(() => {
      // Initialize game when content loads
      if (this.content && this.content.data.length > 0) {
        this.initializeGame();
      }
    }, { allowSignalWrites: true });
    
    // Logic to check for a match when 3 tiles are selected
    effect(() => {
      if (this.selectedTiles().length === 3) {
        this.checkMatch();
      }
    });
  }

  // --- Initialization ---

  initializeGame(): void {
    const initialTiles: GameTile[] = this.content.data.map(tile => ({
      ...tile,
      status: 'default'
    }));

    this.tiles.set(this.shuffle(initialTiles));
    this.selectedTileIds.set([]);
    this.score.set(0);
    this.feedbackMessage.set('மூன்று டைல்களைத் தேர்ந்தெடுக்கவும்.');
  }

  private shuffle(array: GameTile[]): GameTile[] {
    let currentIndex = array.length;
    let temporaryValue;
    let randomIndex;

    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }

  // --- Game Logic ---

  selectTile(tile: GameTile): void {
    if (tile.status === 'hidden' || tile.status === 'matched_temp' || this.selectedTileIds().length >= 3) {
      return;
    }

    if (tile.status === 'selected') {
      // Deselect
      this.selectedTileIds.update(ids => ids.filter(id => id !== tile.id));
      this.updateTileStatus(tile.id, 'default');
    } else {
      // Select
      this.selectedTileIds.update(ids => [...ids, tile.id]);
      this.updateTileStatus(tile.id, 'selected');
      this.feedbackMessage.set('தேர்வு செய்யப்பட்டது...');
    }
  }

  private checkMatch(): void {
    const selectedIds = this.selectedTileIds();
    const answers = this.content.answers;
    let isMatch = false;

    // 1. Check against the predefined answer groups (the robust method)
    const matchingGroup = answers.find(group => {
      // Check if ALL selected IDs are present in this answer group's tileIds
      return selectedIds.every(id => group.tileIds.includes(id));
    });

    if (matchingGroup) {
      isMatch = true;
      this.handleSuccess(selectedIds);
    } else {
      // 2. Fallback check (for general identical content, if necessary)
      // Get the content of the first selected tile in the current language
      const firstTileContent = this.selectedTiles()[0].content[this.currentLang];
      // Check if all three selected tiles have exactly the same content string
      const contentMatch = this.selectedTiles().every(t => t.content[this.currentLang] === firstTileContent);
      
      if (contentMatch) {
          // This should only happen if the JSON integrity is slightly off, but it handles identical triples
          this.handleSuccess(selectedIds);
      } else {
          this.handleFailure(selectedIds);
      }
    }
  }

  private handleSuccess(matchedIds: string[]): void {
    this.feedbackMessage.set('Blast! குழு வெற்றிகரமாக நீக்கப்பட்டது! 🎉');

    // Visually mark them as matched before hiding
    matchedIds.forEach(id => this.updateTileStatus(id, 'matched_temp'));

    setTimeout(() => {
      // Hide the matched tiles and update score
      this.tiles.update(currentTiles => currentTiles.map(t => 
        matchedIds.includes(t.id) ? { ...t, status: 'hidden' } : t
      ));
      
      this.score.update(s => s + 3); // 3 points for 3 tiles
      this.selectedTileIds.set([]); // Clear selection

      if (this.isGameWon()) {
        this.feedbackMessage.set('அனைத்தும் முடிந்தது! ஆட்டம் வெற்றி! 🏆');
      } else {
        this.feedbackMessage.set('அடுத்த குழுவைத் தேர்ந்தெடுக்கவும்.');
      }
    }, 500); // Wait for match animation
  }

  private handleFailure(selectedIds: string[]): void {
    this.feedbackMessage.set('Mismatch! ஒரே குழு அல்ல. மீண்டும் முயற்சிக்கவும்.');

    selectedIds.forEach(id => this.updateTileStatus(id, 'incorrect_temp'));
    
    setTimeout(() => {
      // Reset status to default after failure feedback
      this.tiles.update(currentTiles => currentTiles.map(t => 
        t.status === 'incorrect_temp' ? { ...t, status: 'default' } : t
      ));
      this.selectedTileIds.set([]);
      this.feedbackMessage.set('மூன்று டைல்களைத் தேர்ந்தெடுக்கவும்.');
    }, 1000); // Wait for shake animation
  }

  private updateTileStatus(id: string, newStatus: GameTile['status']): void {
    this.tiles.update(currentTiles => currentTiles.map(t => 
      t.id === id ? { ...t, status: newStatus } : t
    ));
  }

  // --- Content Getter ---

  text(multiLingual: MultiLingualText | TileContent | undefined): string {
    if (!multiLingual) return 'N/A';
    const value = multiLingual[this.currentLang] || multiLingual['en'];
    return value || 'N/A';
  }
}