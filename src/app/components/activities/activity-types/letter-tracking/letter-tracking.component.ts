import { AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../../services/language.service';

type LanguageCode = 'ta' | 'en' | 'si';

interface MultiLingualText {
  [key: string]: string;
}

interface LetterCard {
  id: string;
  glyph: MultiLingualText;
  exampleWord?: MultiLingualText;
  strokeGuide?: MultiLingualText;
}

interface LetterLanguage {
  code: LanguageCode;
  label: string;
  subtitle: string;
  letters: LetterCard[];
}

interface LetterTrackingContent {
  title: MultiLingualText;
  subtitle: MultiLingualText;
  languages: LetterLanguage[];
}

@Component({
  selector: 'app-letter-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letter-tracking.component.html',
  styleUrls: ['./letter-tracking.component.css']
})
export class LetterTrackingComponent implements OnChanges, AfterViewInit {
  @Input() content?: LetterTrackingContent;
  @Input() currentLang: LanguageCode = 'ta';

  @ViewChild('traceCanvas') traceCanvas?: ElementRef<HTMLCanvasElement>;

  selectedLang: LanguageCode = 'ta';
  selectedLetter?: LetterCard;
  isDrawing = false;
  ctx?: CanvasRenderingContext2D | null;
  strokeLength = 0;
  score = 0; // 0-10 simple heuristic
  private lastPos: { x: number; y: number } | null = null;

  constructor(private languageService: LanguageService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentLang']) {
      this.selectedLang = this.currentLang;
    }
    this.ensureLanguageSelection();
    this.ensureLetterSelection();
    this.redrawGuide();
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.redrawGuide();
  }

  get languages(): LetterLanguage[] {
    return this.content?.languages?.length ? this.content.languages : DEFAULT_CONTENT.languages;
  }

  get headerTitle(): string {
    return this.text(this.content?.title) || this.text(DEFAULT_CONTENT.title);
  }

  get headerSubtitle(): string {
    return this.text(this.content?.subtitle) || this.text(DEFAULT_CONTENT.subtitle);
  }

  get activeLanguage(): LetterLanguage | undefined {
    return this.languages.find(l => l.code === this.selectedLang) || this.languages[0];
  }

  get letters(): LetterCard[] {
    return this.activeLanguage?.letters || [];
  }

  text(value?: MultiLingualText): string {
    if (!value) return '';
    return (
      value[this.selectedLang] ||
      value[this.currentLang] ||
      value[this.languageService.getCurrentLanguage()] ||
      value['en'] ||
      value['ta'] ||
      value['si'] ||
      ''
    );
  }

  glyph(letter?: LetterCard, langOverride?: LanguageCode): string {
    if (!letter) return '';
    const lang = langOverride || this.selectedLang;
    return (
      letter.glyph[lang] ||
      letter.glyph[this.currentLang] ||
      letter.glyph['en'] ||
      letter.glyph['ta'] ||
      letter.glyph['si'] ||
      ''
    );
  }

  selectLanguage(code: LanguageCode): void {
    this.selectedLang = code;
    this.selectedLetter = this.activeLanguage?.letters[0];
    setTimeout(() => this.redrawGuide(), 0);
  }

  selectLetter(letter: LetterCard): void {
    this.selectedLetter = letter;
    this.redrawGuide();
  }

  startDrawing(event: PointerEvent): void {
    if (!this.ctx || !this.traceCanvas) return;
    this.isDrawing = true;
    this.strokeLength = 0;
    const pos = this.getRelativePos(event);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
    this.lastPos = pos;
  }

  draw(event: PointerEvent): void {
    if (!this.isDrawing || !this.ctx || !this.traceCanvas) return;
    event.preventDefault();
    const pos = this.getRelativePos(event);
    if (this.lastPos) {
      this.strokeLength += Math.hypot(pos.x - this.lastPos.x, pos.y - this.lastPos.y);
    }
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.lastPos = pos;
  }

  endDrawing(): void {
    if (!this.ctx) return;
    this.isDrawing = false;
    this.lastPos = null;
    this.ctx.closePath();
    this.computeScore();
  }

  clearDrawing(): void {
    this.redrawGuide();
    this.score = 0;
  }

  private setupCanvas(): void {
    if (!this.traceCanvas) return;
    const canvas = this.traceCanvas.nativeElement;
    const parentWidth = canvas.parentElement?.clientWidth || 360;
    canvas.width = parentWidth;
    canvas.height = 260;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.lineWidth = 16;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#7B5BE4';
    }
  }

  private redrawGuide(): void {
    if (!this.ctx || !this.traceCanvas) return;
    const canvas = this.traceCanvas.nativeElement;
    const { width, height } = canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Background
    this.ctx.fillStyle = '#f8f2ff';
    this.ctx.fillRect(0, 0, width, height);

    // Dotted frame
    this.ctx.save();
    this.ctx.strokeStyle = '#cbb5ff';
    this.ctx.setLineDash([12, 10]);
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(18, 18, width - 36, height - 36);
    this.ctx.restore();

    // Ghost glyph
    const ghost = this.glyph(this.selectedLetter);
    if (ghost) {
      this.ctx.save();
      this.ctx.fillStyle = '#d8c7ff';
      this.ctx.globalAlpha = 0.35;
      this.ctx.font = 'bold 180px "Nunito", "Poppins", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(ghost, width / 2, height / 2 + 10);
      this.ctx.restore();
    }

    // Reset stroke style for drawing
    this.ctx.lineWidth = 16;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#7B5BE4';
  }

  private getRelativePos(event: PointerEvent): { x: number; y: number } {
    const rect = this.traceCanvas!.nativeElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private computeScore(): void {
    // Heuristic: more stroke length => higher score up to 10
    const normalized = this.strokeLength / 90; // tune divisor to adjust sensitivity
    this.score = Math.min(10, Math.max(0, Math.round(normalized)));
  }

  private ensureLanguageSelection(): void {
    const hasLang = this.languages.some(l => l.code === this.selectedLang);
    if (!hasLang) {
      this.selectedLang = (this.languages[0]?.code as LanguageCode) || 'ta';
    }
  }

  private ensureLetterSelection(): void {
    if (!this.selectedLetter && this.activeLanguage?.letters?.length) {
      this.selectedLetter = this.activeLanguage.letters[0];
    }
  }
}

const DEFAULT_CONTENT: LetterTrackingContent = {
  title: {
    en: 'Learn Letters',
    ta: 'எழுத்துக்கள் கற்போம்',
    si: 'අකුරු ඉගෙන ගන්න'
  },
  subtitle: {
    en: 'Choose a language and letter to practice',
    ta: 'மொழியும் எழுத்தும் தேர்ந்தெடுத்து பயிற்சி செய்யுங்கள்',
    si: 'භාෂාවක් සහ අකුරක් තෝරන්න'
  },
  languages: [
    {
      code: 'en',
      label: 'English',
      subtitle: 'English Letters',
      letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => ({
        id: `en-${ch}`,
        glyph: { en: ch, ta: ch, si: ch }
      }))
    },
    {
      code: 'ta',
      label: 'Tamil',
      subtitle: 'Tamil Letters',
      letters: [
        'அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ','ஒ','ஓ','ஔ',
        'க','ங','ச','ஞ','ட','ண','த','ந','ப','ம','ய','ர','ல'
      ].map(ch => ({
        id: `ta-${ch}`,
        glyph: { ta: ch, en: ch, si: ch }
      }))
    },
    {
      code: 'si',
      label: 'Sinhala',
      subtitle: 'Sinhala Letters',
      letters: [
        'අ','ආ','ඇ','ඈ','ඉ','ඊ','උ','ඌ','ඍ','ඎ','එ','ඒ','ඔ','ඕ','ඖ',
        'ක','ඛ','ග','ඝ','ච','ඡ','ජ','ඣ','ට','ඩ'
      ].map(ch => ({
        id: `si-${ch}`,
        glyph: { si: ch, en: ch, ta: ch }
      }))
    }
  ]
};
