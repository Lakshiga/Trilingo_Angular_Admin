import { Component, Input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// --- Interfaces ---

type Language = 'ta' | 'en' | 'si';

interface MultiLingualText { [key: string]: string; }

interface CardContent { [key: string]: string | null; }

// Interface for the cards array in JSON
interface DataCard {
  id: string;
  contentType: string;
  content: MultiLingualText;
}

interface AnswerPair {
  card1: string; // ID of the first card in the pair (e.g., C1)
  card2: string; // ID of the second card in the pair (e.g., C2)
}

interface ActivityContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  cards: DataCard[];
  answerPairs: AnswerPair[];
}

// Interface for game state
interface GameCard extends DataCard {
  isFlipped: boolean;
  isMatched: boolean;
}

// --- Component Definition ---

@Component({
  selector: 'app-memory-pair',
  imports: [CommonModule, MatButtonModule, MatIconModule],
  standalone: true,
templateUrl: './memory-pair.component.html',
  styleUrl: './memory-pair.component.css'
})
export class MemoryPairComponent {
  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';

  // --- Game State Signals ---
  gameCards = signal<GameCard[]>([]);
  score = signal(0);
  isLocked = signal(false); // Prevents interaction while cards flip back
  
  // --- Computed Values ---
  flippedCards = computed(() => this.gameCards().filter(c => c.isFlipped && !c.isMatched));
  isGameWon = computed(() => this.gameCards().length > 0 && this.gameCards().every(c => c.isMatched));

  constructor() {
    effect(() => {
      // Initialize game when content loads
      if (this.content && this.content.cards && this.content.cards.length > 0) {
        this.initializeGame();
      }
    }, { allowSignalWrites: true });
    
    // Logic to check for a match when two cards are flipped
    effect(() => {
      if (this.flippedCards().length === 2 && !this.isLocked()) {
        this.checkMatch();
      }
    });
  }

  // --- Initialization Logic ---

  initializeGame(): void {
    const initialCards: GameCard[] = this.shuffle(this.content.cards.map(card => ({
      ...card,
      isFlipped: false,
      isMatched: false
    })));

    this.gameCards.set(initialCards);
    this.score.set(0);
    this.isLocked.set(false);
  }

  private shuffle(array: GameCard[]): GameCard[] {
    let currentIndex = array.length;
    let temporaryValue;
    let randomIndex;

    // Standard Fisher-Yates shuffle
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

  flipCard(cardId: string): void {
    if (this.isLocked()) return;

    this.gameCards.update(cards => cards.map(card => {
      // Only allow flipping if the card is not already matched or flipped
      if (card.id === cardId && !card.isMatched && !card.isFlipped) {
        return { ...card, isFlipped: true };
      }
      return card;
    }));
  }

  private checkMatch(): void {
    const flipped = this.flippedCards();
    if (flipped.length !== 2) return;

    this.isLocked.set(true); // Lock input during check
    const id1 = flipped[0].id;
    const id2 = flipped[1].id;
    let isMatch = false;

    // Check if the pair (id1, id2) or (id2, id1) exists in answerPairs
    isMatch = this.content.answerPairs.some(pair => 
      (pair.card1 === id1 && pair.card2 === id2) || 
      (pair.card1 === id2 && pair.card2 === id1)
    );

    if (isMatch) {
      this.handleMatch(id1, id2);
    } else {
      this.handleNoMatch(id1, id2);
    }
  }

  private handleMatch(id1: string, id2: string): void {
    // Wait for the flip animation to finish (600ms) before locking the cards
    setTimeout(() => {
      this.gameCards.update(cards => cards.map(card => {
        if (card.id === id1 || card.id === id2) {
          return { ...card, isMatched: true };
        }
        return card;
      }));
      this.score.update(s => s + 1);
      this.isLocked.set(false); // Unlock input
    }, 600);
  }

  private handleNoMatch(id1: string, id2: string): void {
    // Wait for the flip animation (600ms) + 500ms before flipping back
    setTimeout(() => {
      this.gameCards.update(cards => cards.map(card => {
        if (card.id === id1 || card.id === id2) {
          return { ...card, isFlipped: false }; // Flip them back down
        }
        return card;
      }));
      this.isLocked.set(false); // Unlock input
    }, 1100);
  }

  // --- Content Getters and Helpers ---

  // Extracts text from MultiLingual object
  text(multiLingual: MultiLingualText | undefined): string {
    if (!multiLingual) return 'N/A';
    return multiLingual[this.currentLang] || multiLingual['en'] || 'N/A';
  }

  // Renders the content of the card face
  getCardFaceContent(card: GameCard): string {
    const content = card.content[this.currentLang];
    const type = card.contentType;

    if (!content) return '';

    if (type === 'image' || type === 'audio') {
      // Return URL for image/audio (image is rendered via <img> tag in HTML)
      return content;
    }
    // Return text content
    return content;
  }
}