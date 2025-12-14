import { AfterViewInit, Component, ElementRef, Input, effect, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../../services/language.service';

// --- Interfaces (Standardized) ---
type Language = 'ta' | 'en' | 'si';
interface MultiLingualText { [key: string]: string; }
interface TileContent { [key: string]: string | null; }

interface Tile {
  id: string; 
  content: TileContent;
}

interface AnswerGroup {
  groupId: string; // "en", "ta", "si" என மொழியை குறிக்கும்
  tileIds: string[];
}

interface ActivityContent {
  activityId: string;
  title: MultiLingualText;
  instruction: MultiLingualText;
  contentType: string;
  data: Tile[];
  answers: AnswerGroup[];
}

@Component({
  selector: 'app-letter-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letter-tracking.component.html',
  styleUrls: ['./letter-tracking.component.css']
})
export class LetterTrackingComponent implements AfterViewInit {
  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';

  @ViewChild('traceCanvas') traceCanvas?: ElementRef<HTMLCanvasElement>;

  // --- State Signals ---
  selectedLangTab = signal<string>('ta'); // Tab selection (matches groupId)
  selectedTileId = signal<string | null>(null);
  
  score = signal(0);
  isDrawing = false;
  private ctx?: CanvasRenderingContext2D | null;
  private strokeLength = 0;
  private lastPos: { x: number; y: number } | null = null;

  // --- Computed Values ---

  // JSON-ல் உள்ள "answers" array-ஐ வைத்து Tabs-ஐ உருவாக்குகிறோம்
  languageTabs = computed(() => {
    if (!this.content?.answers) return [];
    return this.content.answers.map(group => ({
      code: group.groupId, // 'en', 'ta', 'si'
      label: this.getLangLabel(group.groupId)
    }));
  });

  // தேர்ந்தெடுக்கப்பட்ட Tab-க்கு உரிய Tiles-ஐ வடிகட்டுகிறோம்
  currentTiles = computed(() => {
    const group = this.content.answers.find(g => g.groupId === this.selectedLangTab());
    if (!group) return [];
    
    // Group-ல் உள்ள ID-களை வைத்து Data-விலிருந்து முழு Tile-ஐ எடுக்கிறோம்
    return this.content.data.filter(tile => group.tileIds.includes(tile.id));
  });

  // தற்போது தேர்ந்தெடுக்கப்பட்ட எழுத்து (Tile Object)
  activeTile = computed(() => {
    const id = this.selectedTileId();
    const tiles = this.currentTiles();
    if (!id && tiles.length > 0) return tiles[0]; // Default to first
    return tiles.find(t => t.id === id) || tiles[0];
  });

  constructor(private languageService: LanguageService) {
    // Canvas-ஐ புதுப்பிப்பதற்கான Effect
    effect(() => {
       const tile = this.activeTile();
       if (tile) {
         // UI ரெண்டர் ஆனதும் Canvas-ஐ அப்டேட் செய்
         setTimeout(() => this.redrawGuide(), 50); 
       }
    });

    // Content Load ஆனதும் Default Language செட் செய்தல்
    effect(() => {
        if(this.content && this.currentLang) {
             // currentLang இந்த Activity-ல் இருக்கிறதா என பார், இருந்தால் அதை செட் செய்
             const hasLang = this.content.answers.some(a => a.groupId === this.currentLang);
             if(hasLang) this.selectedLangTab.set(this.currentLang);
        }
    }, { allowSignalWrites: true });
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.redrawGuide();
  }

  // --- User Interactions ---

  selectTab(langCode: string) {
    this.selectedLangTab.set(langCode);
    this.selectedTileId.set(null); // Reset selection to first item
    this.score.set(0);
  }

  selectTile(tile: Tile) {
    this.selectedTileId.set(tile.id);
    this.score.set(0);
    this.redrawGuide();
  }

  // --- Helper Methods ---

  text(multiLingual: any): string {
    if (!multiLingual) return '';
    return multiLingual[this.currentLang] || multiLingual['en'] || '';
  }

  // எழுத்தை எடுப்பது (குறிப்பிட்ட மொழிக்குரியது)
  getGlyph(tile: Tile | undefined): string {
    if (!tile) return '';
    // content-ல் key 'ta', 'en' என இருந்தால் அதை எடு, இல்லையெனில் currentLang
    // ஆனால் இந்த JSON அமைப்பில் content-ல் உள்ள key தான் எழுத்து.
    // எ.கா: content: { ta: "அ" }. நாம் Tab 'ta'-வில் இருந்தால் 'ta' value-வை காட்ட வேண்டும்.
    
    const tab = this.selectedLangTab(); // 'ta' or 'en'
    return (tile.content as any)[tab] || (tile.content as any)[this.currentLang] || '';
  }

  getLangLabel(code: string): string {
    const labels: {[key:string]: string} = { 'en': 'English', 'ta': 'தமிழ்', 'si': 'සිංහල' };
    return labels[code] || code.toUpperCase();
  }

  // --- Canvas Logic (Same as before, simplified) ---

  setupCanvas(): void {
    if (!this.traceCanvas) return;
    const canvas = this.traceCanvas.nativeElement;
    // Parent width-ஐ வைத்து Canvas சைஸை மாற்றுவது நல்லது
    canvas.width = canvas.parentElement?.clientWidth || 340;
    canvas.height = 260;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.lineWidth = 16;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#7B5BE4';
    }
  }

  redrawGuide(): void {
    if (!this.ctx || !this.traceCanvas) return;
    const canvas = this.traceCanvas.nativeElement;
    const { width, height } = canvas;
    
    // Clear
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#f8f2ff';
    this.ctx.fillRect(0, 0, width, height);

    // Dotted Frame
    this.ctx.save();
    this.ctx.strokeStyle = '#cbb5ff';
    this.ctx.setLineDash([12, 10]);
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(18, 18, width - 36, height - 36);
    this.ctx.restore();

    // Text Guide
    const char = this.getGlyph(this.activeTile());
    if (char) {
      this.ctx.save();
      this.ctx.fillStyle = '#d8c7ff';
      this.ctx.globalAlpha = 0.35;
      this.ctx.font = 'bold 160px sans-serif'; // Font size adjusted
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(char, width / 2, height / 2 + 10);
      this.ctx.restore();
    }
    
    // Reset Style
    this.ctx.lineWidth = 16;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#7B5BE4';
  }

  startDrawing(event: PointerEvent): void {
    this.isDrawing = true;
    this.strokeLength = 0;
    const pos = this.getRelativePos(event);
    this.ctx?.beginPath();
    this.ctx?.moveTo(pos.x, pos.y);
    this.lastPos = pos;
  }

  draw(event: PointerEvent): void {
    if (!this.isDrawing || !this.ctx) return;
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
    this.isDrawing = false;
    this.ctx?.closePath();
    this.calculateScore();
  }

  clearDrawing(): void {
    this.redrawGuide();
    this.score.set(0);
  }

  calculateScore() {
    // Simple logic: drawing length roughly determines effort
    const normalized = Math.min(10, Math.round(this.strokeLength / 80));
    this.score.set(normalized);
  }

  private getRelativePos(event: PointerEvent) {
    const rect = this.traceCanvas!.nativeElement.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
}