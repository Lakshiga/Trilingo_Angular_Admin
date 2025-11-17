import { Component, Input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// --- Interfaces ---

type Language = 'ta' | 'en' | 'si';
type ContentType = 'word' | 'letter' | 'image'; 

interface MultiLingualText { [key: string]: string; }

interface Bubble {
  id: string;
  content: MultiLingualText;
}

interface ShootableBubble extends Bubble {
  isAvailable: boolean;
}

interface FixedBubble extends Bubble {
  isExploded: boolean;
}

interface AnswerPair {
  shootableId: string;
  fixedId: string;
}

interface ActivityContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  contentType: ContentType;
  fixedBubbles: Bubble[];
  shootableBubbles: Bubble[];
  answerPairs: AnswerPair[];
}

// --- Component Definition ---

@Component({
  selector: 'app-bubble-blast', // MUST be 'app-root' for single component apps
  imports: [CommonModule, MatButtonModule, MatIconModule],
  standalone: true,
  templateUrl: './bubble-blast.component.html',
  styleUrl: './bubble-blast.component.css'
})
export class BubbleBlastComponent {
  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';

  // --- Game State Signals ---
  fixedBubbles = signal<FixedBubble[]>([]);
  shootableBubbles = signal<ShootableBubble[]>([]);
  
  // The bubble currently loaded in the shooter (selected by the user)
  shooterBubble = signal<ShootableBubble | null>(null);
  
  score = signal(0);
  feedbackMessage = signal('');
  isChecking = signal(false);

  // --- Computed Values ---

  // Check if the game is won
  isGameWon = computed(() => this.fixedBubbles().every(b => b.isExploded));
  
  // Get the remaining shootable bubbles (for the tray)
  availableProjectiles = computed(() => this.shootableBubbles().filter(b => b.isAvailable));

  constructor() {
    effect(() => {
      if (this.content && this.content.fixedBubbles.length > 0) {
        this.initializeGame();
      }
    }, { allowSignalWrites: true });
  }

  // --- Initialization ---

  initializeGame(): void {
    // 1. Initialize fixed bubbles (targets)
    const initialFixed: FixedBubble[] = this.content.fixedBubbles.map(b => ({
      ...b,
      isExploded: false
    }));

    // 2. Initialize shootable bubbles (projectiles)
    const initialShootable: ShootableBubble[] = this.content.shootableBubbles.map(b => ({
      ...b,
      isAvailable: true
    }));

    this.fixedBubbles.set(initialFixed);
    this.shootableBubbles.set(initialShootable);
    this.shooterBubble.set(null);
    this.score.set(0);
    this.feedbackMessage.set('சூட வேண்டிய பபிளைத் தேர்ந்தெடுக்கவும்.');
  }
  
  // --- Game Logic ---

  // Selects a bubble from the tray and loads it into the shooter
  loadShooter(bubble: ShootableBubble): void {
    if (this.isChecking()) return;

    // Load the selected bubble into the shooter slot
    this.shooterBubble.set(bubble);
    this.feedbackMessage.set(`'${this.getBubbleContent(bubble)}' சுடத் தயார்.`);
  }

  // Shoots the loaded bubble at the fixed target
  shoot(fixedBubble: FixedBubble): void {
    const shooter = this.shooterBubble();
    if (this.isChecking() || fixedBubble.isExploded || !shooter) {
      return;
    }

    this.isChecking.set(true);

    // 1. Check if the content matches based on the current language
    const fixedContent = this.getBubbleContent(fixedBubble);
    const shooterContent = this.getBubbleContent(shooter);

    // 2. Check if this is a correct match based on the answerPairs
    const isAnswerPair = this.content.answerPairs.some(pair => 
        pair.shootableId === shooter.id && pair.fixedId === fixedBubble.id
    );

    // 3. Match Logic: (Content must be equal AND it must be a correct predefined pair)
    if (fixedContent === shooterContent && isAnswerPair) {
      this.handleMatch(fixedBubble, shooter);
    } else {
      this.handleMiss(fixedBubble);
    }
  }

  private handleMatch(fixedBubble: FixedBubble, shooter: ShootableBubble): void {
    this.feedbackMessage.set('வெற்றி! பபிள் வெடித்தது! 🎉');

    // 1. Explode the fixed bubble
    this.fixedBubbles.update(bubbles => bubbles.map(b => 
      b.id === fixedBubble.id ? { ...b, isExploded: true } : b
    ));

    // 2. Mark the shootable bubble as unavailable
    this.shootableBubbles.update(bubbles => bubbles.map(b => 
      b.id === shooter.id ? { ...b, isAvailable: false } : b
    ));
    
    // 3. Clear shooter and update score
    this.shooterBubble.set(null);
    this.score.update(s => s + 1);

    setTimeout(() => {
        this.isChecking.set(false);
        if (this.isGameWon()) {
            this.feedbackMessage.set('அனைத்தும் வெற்றி! ஆட்டம் முடிந்தது! 🏆');
        } else {
            this.feedbackMessage.set('அடுத்த பபிளைத் தேர்ந்தெடுக்கவும்.');
        }
    }, 500);
  }

  private handleMiss(fixedBubble: FixedBubble): void {
    this.feedbackMessage.set('தவறு! மீண்டும் முயற்சிக்கவும்.');

    setTimeout(() => {
        this.isChecking.set(false);
        this.feedbackMessage.set('சுட வேண்டிய பபிளைத் தேர்ந்தெடுக்கவும்.');
    }, 1000);
  }

  // --- Content Getters and Helpers ---

  text(multiLingual: MultiLingualText | undefined): string {
    if (!multiLingual) return 'N/A';
    return multiLingual[this.currentLang] || multiLingual['en'] || 'N/A';
  }

  // Gets content string based on current language
  getBubbleContent(bubble: Bubble): string {
    return bubble.content[this.currentLang] || bubble.content['en'] || 'N/A';
  }

  // Renders content (Text/Image/Audio Icon) inside the bubble
  renderContent(bubble: Bubble): string {
    const type = this.content.contentType;
    const content = this.getBubbleContent(bubble);

    switch (type) {
        case 'image':
            return `<img src="${content}" alt="Bubble Content" class="max-h-12 object-contain mx-auto"/>`;
        case 'word':
        case 'letter':
            return `<span>${content}</span>`;
        default:
            return `<span>${content}</span>`;
    }
  }
}