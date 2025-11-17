// Multilingual Activity Content Types for Trillingo
import { MultilingualText, MultilingualAudio, MultilingualImage } from './multilingual.types';

// Base interfaces for multilingual content
export interface MultilingualMCQChoice {
  id: string | number;
  text: MultilingualText;
  isCorrect: boolean;
}

export interface MultilingualMCQContent {
  question: MultilingualText;
  instruction?: MultilingualText;
  choices: MultilingualMCQChoice[];
}

export interface MultilingualWord {
  id: string;
  text: MultilingualText;
  audioUrl?: MultilingualAudio;
  imageUrl?: MultilingualImage;
  category?: MultilingualText;
}

export interface MultilingualCategory {
  id: string;
  title: MultilingualText;
}

export interface MultilingualDragDropContent {
  title: MultilingualText;
  activityTitle?: MultilingualText;
  instruction: MultilingualText;
  words: MultilingualWord[];
  categories: MultilingualCategory[];
}

export interface MultilingualSentence {
  id: string;
  text: MultilingualText;
  audioUrl?: MultilingualAudio;
  correctOrder?: number;
}

export interface MultilingualSentenceOrderingContent {
  activityTitle: MultilingualText;
  instruction: MultilingualText;
  imageUrl?: MultilingualImage;
  sentences: MultilingualSentence[];
}

export interface MultilingualFlashcardContent {
  title: MultilingualText;
  instruction?: MultilingualText;
  words: MultilingualWord[];
}

export interface MultilingualStoryContent {
  title: MultilingualText;
  story: MultilingualText;
  audioUrl?: MultilingualAudio;
  imageUrl?: MultilingualImage;
}

export interface MultilingualVideoContent {
  title: MultilingualText;
  instruction?: MultilingualText;
  videoUrl: string;
  subtitles?: MultilingualText;
}

export interface MultilingualSongContent {
  title: MultilingualText;
  instruction?: MultilingualText;
  songUrl: string;
  lyrics?: MultilingualText;
}

export interface MultilingualConversationContent {
  title: MultilingualText;
  audioUrl?: MultilingualAudio;
  messages: {
    id: string;
    speaker: string;
    text: MultilingualText;
    timestamp: number;
  }[];
}

export interface MultilingualEquationContent {
  title: MultilingualText;
  instruction?: MultilingualText;
  equations: {
    leftOperand: string;
    rightOperand: string;
    operator: string;
    answer: string;
  }[];
}

export interface MultilingualRiddleContent {
  title: MultilingualText;
  instruction?: MultilingualText;
  riddles: {
    id: string;
    question: MultilingualText;
    answer: MultilingualText;
    hint?: MultilingualText;
    audioUrl?: MultilingualAudio;
  }[];
}

export interface MultilingualTrueFalseContent {
  title: MultilingualText;
  instruction?: MultilingualText;
  statements: {
    id: string;
    statement: MultilingualText;
    isTrue: boolean;
    explanation?: MultilingualText;
    audioUrl?: MultilingualAudio;
  }[];
}

export interface MultilingualWordScrambleContent {
  title: MultilingualText;
  instruction?: MultilingualText;
  words: {
    id: string;
    scrambled: string;
    correct: MultilingualText;
    hint?: MultilingualText;
    audioUrl?: MultilingualAudio;
  }[];
}

export interface MultilingualImageWordMatchContent {
  title: MultilingualText;
  instruction?: MultilingualText;
  items: {
    id: string;
    imageUrl: string;
    word: MultilingualText;
    audioUrl?: MultilingualAudio;
  }[];
}

export interface MultilingualSoundImageMatchContent {
  title: MultilingualText;
  instruction?: MultilingualText;
  items: {
    id: string;
    imageUrl: string;
    soundUrl: string;
    word: MultilingualText;
  }[];
}

export interface MultilingualLetterSpotlightContent {
  spotlightLetter: string;
  instruction?: MultilingualText;
  words: {
    text: MultilingualText;
    imageUrl?: MultilingualImage;
    audioUrl?: MultilingualAudio;
  }[];
}

export interface MultilingualTamilVowelsContent {
  title: MultilingualText;
  instruction?: MultilingualText;
  vowels: {
    id: string;
    vowel: string;
    word: MultilingualText;
    imageUrl?: MultilingualImage;
    audioUrl?: MultilingualAudio;
  }[];
}

export interface MultilingualLetterFillContent {
  title: MultilingualText;
  instruction?: MultilingualText;
  letters: {
    id: string;
    letter: string;
    word: MultilingualText;
    imageUrl?: MultilingualImage;
    audioUrl?: MultilingualAudio;
  }[];
}

export interface MultilingualInteractiveImageContent {
  title: MultilingualText;
  instruction?: MultilingualText;
  imageUrl: string;
  hotspots: {
    id: string;
    name: MultilingualText;
    audioUrl?: MultilingualAudio;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

export interface MultilingualSceneFinderContent {
  title: MultilingualText;
  sceneImageUrl: string;
  sceneAudioUrl?: MultilingualAudio;
  hotspots: {
    id: number;
    name: MultilingualText;
    audioUrl: MultilingualAudio;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

export interface MultilingualListeningMatchingContent {
  title: MultilingualText;
  introduction: MultilingualText;
  sentences: {
    id: string;
    preBlankText: MultilingualText;
    postBlankText?: MultilingualText;
    audioUrl: MultilingualAudio;
    correctWordId: string;
  }[];
  words: {
    id: string;
    text: MultilingualText;
  }[];
}

export interface MultilingualReadingComprehensionContent {
  title: MultilingualText;
  passage: MultilingualText;
  passageAudioUrl?: MultilingualAudio;
  questions: {
    id: number;
    text: MultilingualText;
    audioUrl?: MultilingualAudio;
  }[];
  answers: {
    id: number;
    text: MultilingualText;
    matchId: number;
  }[];
}

export interface MultilingualPronunciationContent {
  id: number;
  title: MultilingualText;
  text: MultilingualText;
  audioUrl: MultilingualAudio;
}

// Union type for all multilingual content types
export type MultilingualActivityContent = 
  | MultilingualMCQContent
  | MultilingualDragDropContent
  | MultilingualSentenceOrderingContent
  | MultilingualFlashcardContent
  | MultilingualStoryContent
  | MultilingualVideoContent
  | MultilingualSongContent
  | MultilingualConversationContent
  | MultilingualEquationContent
  | MultilingualRiddleContent
  | MultilingualTrueFalseContent
  | MultilingualWordScrambleContent
  | MultilingualImageWordMatchContent
  | MultilingualSoundImageMatchContent
  | MultilingualLetterSpotlightContent
  | MultilingualTamilVowelsContent
  | MultilingualLetterFillContent
  | MultilingualInteractiveImageContent
  | MultilingualSceneFinderContent
  | MultilingualListeningMatchingContent
  | MultilingualReadingComprehensionContent
  | MultilingualPronunciationContent;
