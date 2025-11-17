import { ChangeDetectionStrategy, Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

// --- Interfaces (தரவு மாதிரி) ---

type Language = 'ta' | 'en' | 'si';
type FeedbackStatus = 'default' | 'correct' | 'incorrect' | 'completed';

interface MultiLingualText { [key: string]: string; }

interface Question {
  questionId: string;
  questionType: 'trueFalse';
  statement: MultiLingualText;
  options: { label: MultiLingualText, value: boolean }[];
  correctAnswer: boolean; // Expected answer: true or false
}

interface ActivityContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  questions: Question[];
}

// --- Component Definition ---

@Component({
  selector: 'app-true-false',   // root-ஐ மாற்றி feature/component-க்கு பெயர் கொடுத்தோம்
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './true-false.component.html',
  styleUrls: ['./true-false.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrueFalseComponent { // Class name மாற்றப்பட்டு TrueFalseComponent ஆனது

  @Input() content?: ActivityContent;
  @Input() currentLang: Language = 'ta';

  // Hardcoded Data for running the demo (fallback)
  private defaultContent: ActivityContent = {
    title: { "ta": "மெய் அல்லது பொய்", "en": "True or False", "si": "සැබෑද අසත්‍යද" },
    instruction: { "ta": "கூற்றை வாசித்து, மெய் அல்லது பொய் என்பதைத் தேர்ந்தெடுக்கவும்.", "en": "Read the statement and choose whether it is true or false.", "si": "ප්‍රකාශය කියවා, එය සැබෑද අසත්‍යද යන්න තෝරන්න." },
    questions: [
      {
        "questionId": "TF1",
        "questionType": "trueFalse",
        "statement": {
          "ta": "சூரியன் மேற்கில் உதிக்கிறது.",
          "en": "The sun rises in the west.",
          "si": "හිරු බටහිරින් උදාවෙයි."
        },
        "options": [
          { "label": { "ta": "மெய்", "en": "True", "si": "සැබෑ" }, "value": true },
          { "label": { "ta": "பொய்", "en": "False", "si": "අසත්‍ය" }, "value": false }
        ],
        "correctAnswer": false // பொய் (சூரியன் கிழக்கில் உதிக்கிறது)
      },
      {
        "questionId": "TF2",
        "questionType": "trueFalse",
        "statement": {
          "ta": "பூமி ஒரு தட்டையானது.",
          "en": "The Earth is flat.",
          "si": "පෘථිවිය පැතලිය."
        },
        "options": [
          { "label": { "ta": "மெய்", "en": "True", "si": "සැබෑ" }, "value": true },
          { "label": { "ta": "பொய்", "en": "False", "si": "අසත්‍ය" }, "value": false }
        ],
        "correctAnswer": false // பொய் (பூமி உருண்டையானது)
      },
      {
        "questionId": "TF3",
        "questionType": "trueFalse",
        "statement": {
          "ta": "டைகர் என்பது ஒரு பூனை இனத்தைச் சேர்ந்தது.",
          "en": "The tiger belongs to the cat family.",
          "si": "කොටි බළල් පවුලට අයත් වේ."
        },
        "options": [
          { "label": { "ta": "மெய்", "en": "True", "si": "සැබෑ" }, "value": true },
          { "label": { "ta": "பொய்", "en": "False", "si": "අසත්‍ය" }, "value": false }
        ],
        "correctAnswer": true // மெய்
      }
    ]
  };

  // Get content from input or use default
  get contentData(): ActivityContent {
    return this.content || this.defaultContent;
  }

  // --- Game State Signals ---
  currentQuestionIndex = signal(0);
  score = signal(0);
  userSelection = signal<boolean | null>(null); // Selected answer: true, false, or null
  feedback = signal<FeedbackStatus>('default'); // 'default', 'correct', 'incorrect', 'completed'

  // --- Computed State ---
  currentQuestion = computed(() => {
    return this.contentData.questions[this.currentQuestionIndex()];
  });

  // --- Content Getter ---

  text(multiLingual: MultiLingualText | undefined): string {
    if (!multiLingual) return '';
    return multiLingual[this.currentLang] || multiLingual['en'] || '';
  }

  // --- Game Logic ---

  selectAnswer(value: boolean): void {
    if (this.feedback() !== 'default') return; // Prevent re-selecting after checking

    this.userSelection.set(value);

    const isCorrect = value === this.currentQuestion().correctAnswer;

    if (isCorrect) {
      this.score.update(s => s + 1);
      this.feedback.set('correct');
    } else {
      this.feedback.set('incorrect');
    }
  }

  goToNextQuestion(): void {
    const nextIndex = this.currentQuestionIndex() + 1;

    if (nextIndex < this.contentData.questions.length) {
      this.currentQuestionIndex.set(nextIndex);
      this.userSelection.set(null);
      this.feedback.set('default');
    } else {
      this.feedback.set('completed');
    }
  }

  restartGame(): void {
    this.currentQuestionIndex.set(0);
    this.score.set(0);
    this.userSelection.set(null);
    this.feedback.set('default');
  }
}