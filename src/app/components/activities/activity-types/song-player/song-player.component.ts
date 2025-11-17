import { Component, Input, signal, computed, effect, ElementRef, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

// --- Interfaces ---
type Language = 'ta' | 'en' | 'si';

interface MultiLingualText { [key: string]: string; }

interface SongLyric {
  content: MultiLingualText;
  timestamp: number; // in seconds
}

interface SongData {
  title: MultiLingualText;
  artist: string;
  albumArtUrl: string;
  audioUrl: MultiLingualText; // Multi-lingual audio paths
  lyrics: SongLyric[];
}

interface ActivityContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  songData: SongData;
}

// --- Component Definition ---
@Component({
  selector: 'app-song-player',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDividerModule],
  templateUrl: './song-player.component.html',
  styleUrls: ['./song-player.component.css'],
})
export class SongPlayerComponent implements AfterViewInit, OnDestroy {

  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';
  @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;

  // --- State Signals ---
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  currentLyricIndex = signal(0);

  // --- Computed Values ---
  currentSongData = computed(() => this.content?.songData || null);

  currentAudioUrl: SafeUrl = '';
  private audioContext: AudioContext | null = null;
  private audioSource: MediaElementAudioSourceNode | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngAfterViewInit(): void {
    this.updateAudioSource();
  }

  ngOnDestroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  // --- Core Methods ---
  updateAudioSource(): void {
    const audioPath = this.getAudioPath();
    if (audioPath) {
      this.currentAudioUrl = this.sanitizer.bypassSecurityTrustUrl(audioPath);
    }
    this.setupAudioEvents();
  }

  setupAudioEvents(): void {
    const player = this.audioPlayerRef?.nativeElement;
    if (player) {
      player.onloadedmetadata = () => this.duration.set(player.duration);
      player.ontimeupdate = () => {
        this.currentTime.set(player.currentTime);
        this.syncLyrics(player.currentTime);
      };
      player.onplay = () => this.isPlaying.set(true);
      player.onpause = () => this.isPlaying.set(false);
      player.onended = () => {
        this.isPlaying.set(false);
        this.currentLyricIndex.set(0);
        this.currentTime.set(0);
      };
    }
  }

  // --- Playback Controls ---
  togglePlay(): void {
    const player = this.audioPlayerRef?.nativeElement;
    if (player) {
      if (this.isPlaying()) {
        player.pause();
      } else {
        player.play().catch(e => console.error("Audio playback failed:", e));
      }
    }
  }

  seek(event: Event): void {
    const player = this.audioPlayerRef?.nativeElement;
    if (player) {
      const target = event.target as HTMLInputElement;
      const seekTime = parseFloat(target.value);
      player.currentTime = seekTime;
      this.currentTime.set(seekTime);
    }
  }

  // --- Synchronization Logic ---
  syncLyrics(time: number): void {
    const lyrics = this.currentSongData()?.lyrics || [];
    const currentLyric = lyrics[this.currentLyricIndex()];
    const nextLyric = lyrics[this.currentLyricIndex() + 1];

    if (nextLyric && time >= nextLyric.timestamp) {
      this.currentLyricIndex.set(this.currentLyricIndex() + 1);
      this.scrollToCurrentLyric();
    } else if (currentLyric && time < currentLyric.timestamp) {
      for (let i = this.currentLyricIndex(); i >= 0; i--) {
        if (time >= lyrics[i].timestamp) {
          this.currentLyricIndex.set(i);
          this.scrollToCurrentLyric();
          return;
        }
      }
      if (time < lyrics[0].timestamp) {
        this.currentLyricIndex.set(0);
      }
    }
  }

  scrollToCurrentLyric(): void {
    const currentElement = document.getElementById(`lyric-${this.currentLyricIndex()}`);
    currentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // --- Helpers ---
  text(multiLingual: MultiLingualText | undefined): string {
    if (!multiLingual) return 'N/A';
    return multiLingual[this.currentLang] || multiLingual['en'] || 'N/A';
  }

  getAudioPath(): string {
    const audioContent = this.currentSongData()?.audioUrl;
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
