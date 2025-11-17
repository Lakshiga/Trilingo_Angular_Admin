import { ChangeDetectionStrategy, Component, Input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

// --- Interfaces for Type Safety ---

type Language = 'ta' | 'en' | 'si';
type SegmentType = 'TEXT' | 'BLANK';

interface MultiLingualText { [key: string]: string; }

interface Segment {
  id?: string;
  type: SegmentType;
  content: MultiLingualText;
  hint?: MultiLingualText;
  status?: 'correct' | 'incorrect' | 'default'; // For visual feedback
  userAnswer?: string; // To store the word placed by the user
}

interface Question {
  sentenceId: string;
  mediaUrl?: { default: string };
  segments: Segment[];
  options: MultiLingualText[];
}

interface ActivityContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  questions: Question[];
}

@Component({
  selector: 'app-fill-in-the-blanks',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './fill-in-the-blanks.component.html',
  styleUrl: './fill-in-the-blanks.component.css'
})
export class FillInTheBlanksComponent {

  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';

  // State Signals
  segments = signal<Segment[]>([]); 
  options = signal<{ word: string, available: boolean }[]>([]); 
  activeBlankIndex = signal<number | null>(null); 
  message = signal<string>('வாக்கியத்தைப் பூர்த்தி செய்க.');
  isFinished = signal(false);

  // Computed Values
  currentQuestion = computed(() => this.content?.questions?.[0]);
  
  // Checks if all blank segments have an answer
  isComplete = computed(() => this.segments().filter(s => s.type === 'BLANK').every(s => s.userAnswer));

  // --- Initialization ---

  constructor() {
    // Initialize the activity when content is loaded
    effect(() => {
      if (this.currentQuestion()) {
        this.initializeActivity();
      }
    }, { allowSignalWrites: true });
  }

  initializeActivity(): void {
    const q = this.currentQuestion();
    if (!q) return;

    // 1. Initialize Segments with default state
    const initialSegments: Segment[] = q.segments.map((s, index) => ({
      ...s,
      status: 'default',
      userAnswer: undefined,
      id: `${q.sentenceId}-${index}` // Assign unique ID
    }));
    this.segments.set(initialSegments);

    // 2. Initialize and Shuffle Options
    const initialOptions = q.options.map(opt => ({
      word: this.text(opt),
      available: true
    }));
    this.options.set(this.shuffle(initialOptions));
    this.isFinished.set(false); // Reset game state
    this.activeBlankIndex.set(null);
    this.message.set('வாக்கியத்தைப் பூர்த்தி செய்க.');
  }

  // --- Game Logic ---

  // Sets the currently active blank segment (when user clicks a blank)
  setActiveBlank(sIndex: number): void {
    if (this.isFinished()) return;
    this.activeBlankIndex.set(sIndex);
    this.message.set(this.segments()[sIndex].hint?.[this.currentLang] || 'Select an option to fill the blank.');
  }

  // Handles placing an option into the active blank (when user clicks an option chip)
  selectOption(optionIndex: number): void {
    const blankIndex = this.activeBlankIndex();
    if (blankIndex === null) {
        this.message.set('முதலில் காலி இடத்தை (Blank) தேர்ந்தெடுக்கவும்.');
        return;
    }
    
    const selectedOption = this.options()[optionIndex];
    if (!selectedOption.available) return;

    // 1. Check if the current blank already has an answer (and free up the old option)
    const currentSegments = this.segments();
    const targetSegment = currentSegments[blankIndex];

    if (targetSegment.userAnswer) {
        // Find the old option in the options array and mark it as available again
        this.freeUpOption(targetSegment.userAnswer);
    }

    // 2. Place the new option's word into the blank segment
    this.segments.update(segments => 
        segments.map((s, i) => 
            i === blankIndex ? { ...s, userAnswer: selectedOption.word, status: 'default' } : s
        )
    );

    // 3. Mark the selected option as used/unavailable
    this.options.update(options => 
        options.map((opt, i) => 
            i === optionIndex ? { ...opt, available: false } : opt
        )
    );

    this.activeBlankIndex.set(null); // Deselect the blank
    this.message.set('தேர்வு நிரப்பப்பட்டது.');
  }
  
  // Removes the word from the blank segment and frees up the option
  removeAnswerFromBlank(sIndex: number, answer: string): void {
      if (this.isFinished()) return;
      
      this.segments.update(segments => 
          segments.map((s, i) => 
              i === sIndex ? { ...s, userAnswer: undefined, status: 'default' } : s
          )
      );
      this.freeUpOption(answer);
      this.activeBlankIndex.set(null);
      this.message.set('விடை நீக்கப்பட்டது.');
  }

  private freeUpOption(word: string): void {
      this.options.update(options => 
          options.map(opt => 
              opt.word === word ? { ...opt, available: true } : opt
          )
      );
  }


  // --- Final Check & Feedback ---

  checkAnswers(): void {
    if (!this.isComplete()) {
        this.message.set('அனைத்துக் காலியிடங்களையும் நிரப்பவும்.');
        return;
    }
    
    let allCorrect = true;
    
    this.segments.update(segments => 
        segments.map((s, index) => {
            if (s.type === 'BLANK' && s.userAnswer) {
                // Check against the correct answer in the JSON (content)
                const isCorrect = s.userAnswer === this.text(s.content);
                if (!isCorrect) {
                    allCorrect = false;
                }
                return { ...s, status: isCorrect ? 'correct' : 'incorrect' };
            }
            return s;
        })
    );

    this.isFinished.set(true);
    if (allCorrect) {
        this.message.set('சரியான விடை! வாழ்த்துக்கள்! 🎉');
    } else {
        this.message.set('சில விடைகள் தவறாக உள்ளன. விடைகளை நீக்க (x) ஐ அழுத்தவும், பின்னர் மீண்டும் முயற்சிக்கவும்.');
    }
  }

  // --- Utility Functions ---

  private shuffle(array: any[]): any[] {
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
  
  text(multiLingual: MultiLingualText): string {
    return multiLingual[this.currentLang] || multiLingual['en'] || 'N/A';
  }

}
