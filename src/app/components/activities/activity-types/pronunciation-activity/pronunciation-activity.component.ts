import { Component, Input, signal, computed, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

// --- Interfaces ---

type Language = 'ta' | 'en' | 'si';

interface MultiLingualText { [key: string]: string; }

interface TaskContent {
  word: MultiLingualText;
  audioUrl: MultiLingualText;
  imageUrl: string;
}

interface Task {
  taskId: string;
  taskType: 'pronunciation';
  content: TaskContent;
  userResponse: {
    recordedAudio: string | null; // Base64 audio data
    score: number | null;
    recognizedText: string | null;
    isCorrect: boolean | null;
  };
}

interface ActivityContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  task: Task;
}

interface ScoreResult {
    score: number;
    recognizedText: string;
    isCorrect: boolean;
}

// --- Component Definition ---

@Component({
  selector: 'app-pronunciation-activity', // MUST be 'app-root' for single component apps
  imports: [CommonModule, MatButtonModule, MatIconModule],
  standalone: true,
  templateUrl: './pronunciation-activity.component.html',
  styleUrls: ['./pronunciation-activity.component.css']
})
export class PronunciationActivityComponent implements OnInit, OnDestroy { // Changed class name to App
  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';

  // --- State Signals ---
  isRecording = signal(false);
  isChecking = signal(false);
  recordingError = signal<string | null>(null);
  scoreResult = signal<ScoreResult | null>(null);
  
  // --- Audio Recording Variables ---
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioBlob: Blob | null = null;
  
  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // Initial check to ensure content structure is valid
  }

  ngOnDestroy(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  // --- Content Getters ---

  text(multiLingual: MultiLingualText | undefined): string {
    if (!multiLingual) return 'N/A';
    return multiLingual[this.currentLang] || multiLingual['en'] || 'N/A';
  }

  currentTask = computed(() => this.content?.task || null);

  getTargetWord(): string {
    return this.text(this.currentTask()?.content.word);
  }

  getTargetAudioPath(): string {
    const audioContent = this.currentTask()?.content.audioUrl;
    if (!audioContent) return '';
    return audioContent[this.currentLang] || audioContent['ta'] || '';
  }

  getTargetImagePath(): string {
    return this.currentTask()?.content.imageUrl || 'https://placehold.co/100x100/D1D5DB/4B5563?text=IMG';
  }

  // --- Audio Playback ---

  playSound(): void {
    const audioPath = this.getTargetAudioPath();
    if (audioPath) {
      const audio = new Audio(audioPath);
      audio.play().catch(e => console.error("Audio playback failed:", e));
    }
  }

  // --- Recording Logic ---

  async startRecording(): Promise<void> {
    this.recordingError.set(null);
    this.scoreResult.set(null);
    this.audioChunks = [];
    this.audioBlob = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      
      this.mediaRecorder.ondataavailable = event => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm; codecs=opus' });
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop()); // Stop mic track
        this.checkPronunciation();
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);

    } catch (err) {
      console.error('Microphone access denied or failed:', err);
      this.recordingError.set('Microphone access required. Please grant permission.');
      this.isRecording.set(false);
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
    }
  }

  // --- API Check Logic (Simulated for Gemini API) ---

  private async checkPronunciation(): Promise<void> {
    if (!this.audioBlob) {
      this.recordingError.set('No audio recorded.');
      return;
    }

    this.isChecking.set(true);
    
    // 1. Convert Blob to Base64
    const base64Audio = await this.blobToBase64(this.audioBlob);
    
    // 2. Prepare API Call
    const targetWord = this.getTargetWord();
    const systemPrompt = `You are a language pronunciation grader. The user will provide an audio recording and the target word. Your task is to transcribe the audio and evaluate how closely it matches the target word phonetically. Respond only with a JSON object.`;
    const userQuery = `Target word: "${targetWord}". Evaluate the provided audio.`;
    const audioMimeType = this.audioBlob.type;
    
    // 3. Simulated API Request (Must be implemented with exponential backoff)
    // NOTE: This uses the Gemini Multimodal capability (audio + text)
    try {
        const apiKey = ""; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [
                        { text: userQuery },
                        { inlineData: { mimeType: audioMimeType, data: base64Audio } }
                    ]
                }],
                // Using structured response for grading
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            transcription: { type: "STRING", description: "The transcribed text from the user's audio." },
                            matchScore: { type: "NUMBER", description: "A phonetic match score between 0 and 100 based on the target word." },
                            isCorrect: { type: "BOOLEAN", description: "True if matchScore is >= 80 and transcription matches the word." }
                        }
                    }
                },
                systemInstruction: { parts: [{ text: systemPrompt }] }
            })
        });

        const result = await response.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (jsonText) {
            const apiResponse = JSON.parse(jsonText);
            const score = apiResponse.matchScore || 0;
            const recognizedText = apiResponse.transcription || 'N/A';
            const isCorrect = score >= 80; // Example logic: 80% score is correct

            this.scoreResult.set({
                score: score,
                recognizedText: recognizedText,
                isCorrect: isCorrect
            });
        } else {
            this.recordingError.set("API failed to return a valid result.");
        }

    } catch (error) {
        console.error("API Error during pronunciation check:", error);
        this.recordingError.set("API check failed. See console for details.");
    } finally {
        this.isChecking.set(false);
    }
  }

  // --- Utility Functions ---
  
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Extract base64 part (data:audio/webm;base64,...)
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // --- Navigation ---
  
  goToNextTask(): void {
    // In a real app, this would navigate to the next item in the task list.
    this.scoreResult.set(null);
    this.recordingError.set(null);
    console.log("Navigating to next task (Simulated)");
  }
}