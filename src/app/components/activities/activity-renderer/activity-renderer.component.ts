import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../../../services/language.service';

// Import base activity type components only
import { McqActivityComponent } from '../activity-types/mcq-activity/mcq-activity.component';
import { FlashcardComponent } from '../activity-types/flashcard/flashcard.component';
import { AppMatchingAdminForm } from '../activity-types/matching/matching.component';
import { FillInTheBlanksComponent } from '../activity-types/fill-in-the-blanks/fill-in-the-blanks.component';
import { TrueFalseComponent } from "../activity-types/true-false/true-false.component";
import { SongPlayerComponent } from '../activity-types/song-player/song-player.component';
import { StoryPlayerComponent } from '../activity-types/story-player/story-player.component';
import { PronunciationActivityComponent } from '../activity-types/pronunciation-activity/pronunciation-activity.component';
import { ScrumbleActivityComponent } from '../activity-types/scrumble-activity/scrumble-activity.component';
import { TripleBlastComponent } from '../activity-types/triple-blast/triple-blast.component';
import { BubbleBlastComponent } from '../activity-types/bubble-blast/bubble-blast.component';
import { MemoryPairComponent } from '../activity-types/memory-pair/memory-pair.component';
import { GroupSorterComponent } from '../activity-types/group-sorter/group-sorter.component';

@Component({
  selector: 'app-activity-renderer',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    FlashcardComponent,
    AppMatchingAdminForm,
    FillInTheBlanksComponent,
    McqActivityComponent,
    TrueFalseComponent,
    SongPlayerComponent,
    StoryPlayerComponent,
    PronunciationActivityComponent,
    ScrumbleActivityComponent,
    TripleBlastComponent,
    BubbleBlastComponent,
    MemoryPairComponent,
    GroupSorterComponent,
],
  templateUrl: './activity-renderer.component.html',
  styleUrls: ['./activity-renderer.component.css']
})
export class ActivityRendererComponent implements OnChanges {
  @Input() activityTypeId!: number;
  @Input() content: any;

  constructor(public languageService: LanguageService) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Force change detection when inputs change
  }

  isKnownActivityType(): boolean {
    // Activity types 1-8 are implemented: 1 (flashcard), 2 (matching), 3 (fill-in-the-blanks), 4 (mcq-activity), 5 (true-false), 6 (song-player), 7 (story-player), 8 (pronunciation-activity)
    const knownTypes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    return knownTypes.includes(this.activityTypeId);
  }

  text(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      // Prefer English explicitly for preview/title rendering
      if ('en' in value) return String((value as any).en || '');
      if ('ta' in value || 'si' in value) return String((value as any).en || (value as any).ta || (value as any).si || '');
    }
    return JSON.stringify(value);
  }

  image(value: any): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return this.languageService.getImage(value as any);
    }
    return undefined;
  }

  audio(value: any): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return this.languageService.getAudio(value as any);
    }
    return undefined;
  }

  // Adapter for Activity Type 2: MediaSpotlightMultiple
  mediaSpotlightMultipleContent(): any {
    const c: any = this.content || {};
    const items = Array.isArray(c.mediaItems)
      ? c.mediaItems.map((m: any) => ({
          text: this.text(m?.text || ''),
          imageUrl: m?.url || m?.imageUrl || '',
          audioUrl: this.audio(m?.audioUrl)
        }))
      : [];
    return {
      title: this.text(c?.title),
      spotlightLetter: '',
      items
    };
  }
}