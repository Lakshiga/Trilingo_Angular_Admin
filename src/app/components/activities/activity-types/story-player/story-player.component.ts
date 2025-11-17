import { Component, Input, signal, computed, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

// --- Interfaces ---
type Language = 'ta' | 'en' | 'si';

interface MultiLingualText { [key: string]: string; }

interface Scene {
  imageUrl: string;
  content: MultiLingualText;
  timestamp: number; // in seconds
}

interface StoryData {
  title: MultiLingualText;
  audioUrl: MultiLingualText;
  scenes: Scene[];
}

interface ActivityContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  storyData: StoryData;
}

// --- Component Definition ---
@Component({
  selector: 'app-story-player',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './story-player.component.html',
  styleUrls: ['./story-player.component.css']
})
export class StoryPlayerComponent implements AfterViewInit, OnDestroy {

  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';
  @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;

  // --- Signals ---
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  currentSceneIndex = signal(0);

  // --- Computed Values ---
  currentStoryData = computed(() => this.content?.storyData || null);

  currentScene = computed(() => {
    const data = this.currentStoryData();
    const index = this.currentSceneIndex();
    return data && data.scenes ? data.scenes[index] : null;
  });

  currentAudioUrl: SafeUrl = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngAfterViewInit(): void {
    if (this.audioPlayerRef) {
      this.updateAudioSource();
    }
  }

  ngOnDestroy(): void {
    // Optional cleanup
  }

  // --- Audio Source & Events ---
  updateAudioSource(): void {
    const audioPath = this.getAudioPath();
    if (audioPath) {
      this.currentAudioUrl = this.sanitizer.bypassSecurityTrustUrl(audioPath);
    }
    this.setupAudioEvents();
  }

  setupAudioEvents(): void {
    const player = this.audioPlayerRef?.nativeElement;
    if (!player) return;

    player.onloadedmetadata = () => this.duration.set(player.duration);

    player.ontimeupdate = () => {
      this.currentTime.set(player.currentTime);
      this.syncScenes(player.currentTime);
    };

    player.onplay = () => this.isPlaying.set(true);
    player.onpause = () => this.isPlaying.set(false);
    player.onended = () => {
      this.isPlaying.set(false);
      this.currentSceneIndex.set(0);
      this.currentTime.set(0);
    };
  }

  // --- Playback Controls ---
  togglePlay(): void {
    const player = this.audioPlayerRef?.nativeElement;
    if (!player) return;

    if (this.isPlaying()) {
      player.pause();
    } else {
      if (!player.src) this.updateAudioSource();
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
    this.syncScenes(seekTime, true);
  }

  // --- Scene Sync Logic ---
  syncScenes(time: number, isSeek = false): void {
    const scenes = this.currentStoryData()?.scenes || [];
    if (scenes.length === 0) return;

    const currentIndex = this.currentSceneIndex();
    const nextScene = scenes[currentIndex + 1];

    // Move forward
    if (nextScene && time >= nextScene.timestamp) {
      this.currentSceneIndex.set(currentIndex + 1);
      return;
    }

    // Handle rewind
    if (isSeek && time < scenes[currentIndex].timestamp) {
      for (let i = currentIndex; i >= 0; i--) {
        if (time >= scenes[i].timestamp) {
          this.currentSceneIndex.set(i);
          return;
        }
      }
      if (time < scenes[0].timestamp) {
        this.currentSceneIndex.set(0);
      }
    }
  }

  // --- Helpers ---
  text(multiLingual: MultiLingualText | undefined): string {
    if (!multiLingual) return 'N/A';
    return multiLingual[this.currentLang] || multiLingual['en'] || 'N/A';
  }

  getAudioPath(): string {
    const audioContent = this.currentStoryData()?.audioUrl;
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
