import { Component, Input, signal, computed, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

// --- Interfaces ---
export type Language = 'ta' | 'en' | 'si';

export interface MultiLingualText { [key: string]: string; }
export interface MultiLingualNumber { [key: string]: number; } // New: Time per language

export interface Speaker {
  id: string;
  name: MultiLingualText;
  avatarUrl: string;
  position: 'left' | 'right';
}

export interface DialogueLine {
  speakerId: string;
  content: MultiLingualText;
  timestamp: MultiLingualNumber; // Changed from number to object
}

export interface ConversationData {
  title: MultiLingualText;
  audioUrl: MultiLingualText;
  speakers: Speaker[];
  dialogues: DialogueLine[];
}

export interface ActivityContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  conversationData: ConversationData;
}

@Component({
  selector: 'app-conversation-player',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './conversation-player.component.html',
  styleUrls: ['./conversation-player.component.css']
})
export class ConversationPlayerComponent implements AfterViewInit, OnDestroy {

  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';
  
  @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;
  @ViewChild('chatContainer') chatContainerRef!: ElementRef<HTMLDivElement>;

  // --- Signals ---
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  currentDialogueIndex = signal(0);

  // --- Computed Values ---
  currentConversationData = computed(() => this.content?.conversationData || null);

  currentAudioUrl: SafeUrl = '';

  constructor(private sanitizer: DomSanitizer) {
    // Effect: Auto-scroll when dialogue index changes
    effect(() => {
      const index = this.currentDialogueIndex();
      // Scroll only if playing or manually seeking
      if (this.currentConversationData()) {
         setTimeout(() => this.scrollToActiveDialogue(index), 100);
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.audioPlayerRef) {
      this.updateAudioSource();
    }
  }

  ngOnDestroy(): void {
    // Cleanup logic if needed
  }

  // --- Audio Source Management ---
  updateAudioSource(): void {
    const audioPath = this.getAudioPath();
    if (audioPath) {
      this.currentAudioUrl = this.sanitizer.bypassSecurityTrustUrl(audioPath);
    }
    
    // Reset state when language changes
    this.isPlaying.set(false);
    this.currentTime.set(0);
    this.currentDialogueIndex.set(0);
    
    // Reload audio element
    if (this.audioPlayerRef?.nativeElement) {
      this.audioPlayerRef.nativeElement.load();
      this.setupAudioEvents();
    }
  }

  setupAudioEvents(): void {
    const player = this.audioPlayerRef?.nativeElement;
    if (!player) return;

    player.onloadedmetadata = () => this.duration.set(player.duration);
    
    player.ontimeupdate = () => {
      this.currentTime.set(player.currentTime);
      this.syncDialogues(player.currentTime);
    };

    player.onplay = () => this.isPlaying.set(true);
    player.onpause = () => this.isPlaying.set(false);
    player.onended = () => {
      this.isPlaying.set(false);
      this.currentDialogueIndex.set(0);
      this.currentTime.set(0);
      if (this.chatContainerRef?.nativeElement) {
        this.chatContainerRef.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
  }

  // --- Playback Controls ---
  togglePlay(): void {
    const player = this.audioPlayerRef?.nativeElement;
    if (!player) return;

    if (this.isPlaying()) {
      player.pause();
    } else {
      // If src is empty (first load), update it
      if (!player.currentSrc) this.updateAudioSource();
      player.play().catch(e => console.error('Audio playback failed:', e));
    }
  }

  seek(event: Event): void {
    const player = this.audioPlayerRef?.nativeElement;
    if (!player) return;

    const target = event.target as HTMLInputElement;
    const seekTime = parseFloat(target.value);
    player.currentTime = seekTime;
    this.currentTime.set(seekTime);
    this.syncDialogues(seekTime, true);
  }

  // --- Core Sync Logic (Language Aware) ---
  
  // Helper: Get timestamp for the specific language
  getDialogueTime(dialogue: DialogueLine): number {
    if (!dialogue?.timestamp) return 0;
    // Fallback order: Current Lang -> English -> 0
    return dialogue.timestamp[this.currentLang] ?? dialogue.timestamp['en'] ?? 0;
  }

  syncDialogues(time: number, isSeek = false): void {
    const dialogues = this.currentConversationData()?.dialogues || [];
    if (dialogues.length === 0) return;

    const currentIndex = this.currentDialogueIndex();
    const nextDialogue = dialogues[currentIndex + 1];

    // 1. Move Forward
    if (nextDialogue) {
      const nextTime = this.getDialogueTime(nextDialogue);
      if (time >= nextTime) {
        this.currentDialogueIndex.set(currentIndex + 1);
        return;
      }
    }

    // 2. Handling Seek / Rewind
    // Check if current time is BEFORE the current dialogue's start time
    const currentMsgTime = this.getDialogueTime(dialogues[currentIndex]);

    if (isSeek && time < currentMsgTime) {
      // Find the correct index by checking backwards
      for (let i = currentIndex; i >= 0; i--) {
        const thisMsgTime = this.getDialogueTime(dialogues[i]);
        if (time >= thisMsgTime) {
          this.currentDialogueIndex.set(i);
          return;
        }
      }
      // If time is before the very first dialogue
      if (time < this.getDialogueTime(dialogues[0])) {
        this.currentDialogueIndex.set(0);
      }
    }
  }

  // --- UI Helpers ---
  scrollToActiveDialogue(index: number): void {
    const container = this.chatContainerRef?.nativeElement;
    if (!container) return;

    // Logic: Find the child element corresponding to index
    const dialogueElements = container.querySelectorAll('.dialogue-row');
    const targetElement = dialogueElements[index] as HTMLElement;

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  getSpeaker(id: string): Speaker | undefined {
    return this.currentConversationData()?.speakers.find(s => s.id === id);
  }

  text(multiLingual: MultiLingualText | undefined): string {
    if (!multiLingual) return '';
    return multiLingual[this.currentLang] || multiLingual['en'] || '';
  }

  getAudioPath(): string {
    const audioContent = this.currentConversationData()?.audioUrl;
    if (!audioContent) return '';
    return audioContent[this.currentLang] || audioContent['ta'] || '';
  }

  formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
}