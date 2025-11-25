import { Component, Input, AfterViewInit, ElementRef, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

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
export class VideoPlayerComponent implements AfterViewInit {

  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';

  @ViewChild('videoPlayer') videoRef!: ElementRef<HTMLVideoElement>;

  currentVideoData = computed(() => this.content?.videoData || null);
  currentVideoUrl = '';

  ngAfterViewInit(): void {
    this.loadVideoSource();
  }

  loadVideoSource(): void {
    const url = this.currentVideoData()?.videoUrl[this.currentLang];
    this.currentVideoUrl = url ?? '';
  }

  text(obj: MultiLingualText): string {
    return obj[this.currentLang] || obj['en'] || '';
  }
}
