import { Component, Input, AfterViewInit, ElementRef, ViewChild, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../../services/language.service';

type Language = 'ta' | 'en' | 'si';

interface MultiLingualText { [key: string]: string; }

interface VideoData {
  videoUrl: MultiLingualText;
}

interface ActivityContent {
  title: MultiLingualText;
  description: MultiLingualText;
  videoData: VideoData;
}

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.css']
})
export class VideoPlayerComponent implements AfterViewInit, OnChanges {

  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';

  @ViewChild('videoPlayer') videoRef!: ElementRef<HTMLVideoElement>;

  currentVideoData = computed(() => this.content?.videoData || null);
  currentVideoUrl = '';

  constructor(private languageService: LanguageService) {}

  ngAfterViewInit(): void {
    this.loadVideoSource();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentLang'] && !changes['currentLang'].firstChange) {
      this.loadVideoSource();
    }
  }

  loadVideoSource(): void {
    const raw =
      this.currentVideoData()?.videoUrl[this.currentLang] ||
      this.currentVideoData()?.videoUrl['en'] ||
      this.currentVideoData()?.videoUrl['ta'] ||
      this.currentVideoData()?.videoUrl['si'] ||
      '';
    const url = this.languageService.resolveUrl(raw);
    this.currentVideoUrl = url ?? '';
  }

  text(obj: MultiLingualText): string {
    return obj[this.currentLang] || obj['en'] || '';
  }
}
