import { ChangeDetectionStrategy, Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

// --- Interfaces (Data Model) ---

type Language = 'ta' | 'en' | 'si';
type ContentType = 'text' | 'image' | 'audio';
type FeedbackStatus = 'default' | 'correct' | 'incorrect' | 'completed';

interface MultiLingualText { [key: string]: string; }
interface ContentData { [key: string]: string | null; }

interface QuestionItem {
  type: ContentType;
  content: ContentData;
}

interface Option {
  content: ContentData;
  isCorrect: boolean;
}

interface Question {
  questionId: string;
  question: QuestionItem;
  answerType: ContentType;
  options: Option[];
}

interface ActivityContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  questions: Question[];
}

// --- Component Definition ---

@Component({
  selector: 'app-mcq-activity',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './mcq-activity.component.html',
  styleUrls: ['./mcq-activity.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class McqActivityComponent {

  @Input() content?: ActivityContent;
  @Input() currentLang: Language = 'ta';

  // Hardcoded Data for running the demo (fallback)
  private defaultContent: ActivityContent = {
    title: { ta: "வினாவிடை", en: "Quiz Time", si: "ප්‍රශ්න කාලය" },
    instruction: { ta: "சரியான பதிலைத் தேர்ந்தெடுக்கவும்.", en: "Select the correct answer.", si: "නිවැරදි පිළිතුර තෝරන්න." },
    questions: [
      {
        questionId: "MQ1",
        question: { type: "text", content: { ta: "கீழ்க்கண்டவற்றில் எது பழம்?", en: "Which of the following is a fruit?", si: "පලතුරක් යනු කුමක්ද?" } },
        answerType: "text",
        options: [
          { content: { ta: "நாய்", en: "Dog", si: "බල්ලා" }, isCorrect: false },
          { content: { ta: "ஆப்பிள்", en: "Apple", si: "ඇපල්" }, isCorrect: true },
          { content: { ta: "கார்", en: "Car", si: "කාර්" }, isCorrect: false }
        ]
      },
      {
        questionId: "MQ2",
        question: { type: "audio", content: { ta: "/audio/ta/lion.mp3", en: "/audio/en/lion.mp3", si: "/audio/si/lion.mp3" } },
        answerType: "image",
        options: [
          { content: { ta: "/images/dog.png", en: "/images/dog.png", si: "/images/dog.png" }, isCorrect: false },
          { content: { ta: "/images/lion.png", en: "/images/lion.png", si: "/images/lion.png" }, isCorrect: true },
          { content: { ta: "/images/cat.png", en: "/images/cat.png", si: "/images/cat.png" }, isCorrect: false }
        ]
      },
      {
        questionId: "MQ3",
        question: { type: "image", content: { ta: "https://placehold.co/100x100/A0E7E5/000000?text=Two", en: "https://placehold.co/100x100/A0E7E5/000000?text=Two", si: "https://placehold.co/100x100/A0E7E5/000000?text=Two" } },
        answerType: "text",
        options: [
          { content: { ta: "ஒன்று", en: "One", si: "එක" }, isCorrect: false },
          { content: { ta: "மூன்று", en: "Three", si: "තුන" }, isCorrect: false },
          { content: { ta: "இரண்டு", en: "Two", si: "දෙක" }, isCorrect: true }
        ]
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
  userSelection = signal(-1);
  feedback = signal<FeedbackStatus>('default');

  // --- Computed State ---
  currentQuestion = computed(() => this.contentData.questions[this.currentQuestionIndex()]);

  // --- Helpers ---
  text(multiLingual: MultiLingualText | undefined): string {
    if (!multiLingual) return '';
    return multiLingual[this.currentLang] || multiLingual['en'] || '';
  }

  getQuestionContent(): string {
    const q = this.currentQuestion().question;
    return q.content[this.currentLang] || '';
  }

  getOptionContent(option: Option): string {
    return option.content[this.currentLang] || '';
  }

  // --- Game Logic ---
  selectOption(optionIndex: number): void {
    if (this.feedback() !== 'default') return;

    this.userSelection.set(optionIndex);
    const selectedOption = this.currentQuestion().options[optionIndex];

    if (selectedOption.isCorrect) {
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
      this.userSelection.set(-1);
      this.feedback.set('default');
    } else {
      this.feedback.set('completed');
    }
  }

  restartGame(): void {
    this.currentQuestionIndex.set(0);
    this.score.set(0);
    this.userSelection.set(-1);
    this.feedback.set('default');
  }

  // --- Media ---
  playSound(content: ContentData, event?: Event): void {
    if (event) event.stopPropagation();
    const audioPath = content[this.currentLang];
    if (audioPath) {
      const audio = new Audio(audioPath);
      audio.play().catch(e => console.error("Audio playback failed:", e));
    }
  }

  getFallbackImage(type: ContentType): string {
    if (type === 'image') return 'https://placehold.co/100x100/60A5FA/ffffff?text=Image';
    if (type === 'audio') return 'https://placehold.co/100x100/10B981/ffffff?text=Audio';
    return '';
  }
}
