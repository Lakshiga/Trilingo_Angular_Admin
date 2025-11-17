import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Exercise } from '../../../services/exercise-api.service';

@Component({
  selector: 'app-exercise-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatExpansionModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule
  ],
  templateUrl: './exercise-editor.component.html',
  styleUrls: ['./exercise-editor.component.css']
})
export class ExerciseEditorComponent {
  @Input() exercises: Exercise[] = [];
  @Input() activityId: string | null = null;
  @Input() activityTypeId: number = 0;
  @Input() expandedExercise: number | false = false;
  @Output() addExercise = new EventEmitter<void>();
  @Output() updateExercise = new EventEmitter<{ exerciseId: number; jsonData: string }>();
  @Output() deleteExercise = new EventEmitter<number>();
  @Output() previewExercise = new EventEmitter<string>();
  @Output() expansionChange = new EventEmitter<{ index: number; isExpanded: boolean }>();

  editingExercises: Map<number, string> = new Map();
  jsonErrors: Map<number, string> = new Map();

  constructor(private snackBar: MatSnackBar) {}

  getExerciseJson(exercise: Exercise): string {
    const exerciseId = exercise.id;
    // If currently editing, return the editing version
    if (this.editingExercises.has(exerciseId)) {
      return this.editingExercises.get(exerciseId)!;
    }
    // Otherwise return the saved version formatted
    try {
      const parsed = JSON.parse(exercise.jsonData);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return exercise.jsonData;
    }
  }

  hasJsonError(exercise: Exercise): boolean {
    return this.jsonErrors.has(exercise.id);
  }

  getJsonError(exercise: Exercise): string {
    return this.jsonErrors.get(exercise.id) || '';
  }

  handleExerciseChange(exercise: Exercise, value: string): void {
    const exerciseId = exercise.id;
    this.editingExercises.set(exerciseId, value);

    try {
      const parsed = JSON.parse(value);
      
      // Validate JSON structure against activity type
      const structureError = this.validateJsonStructure(parsed, this.activityTypeId);
      if (structureError) {
        this.jsonErrors.set(exerciseId, structureError);
      } else {
        this.jsonErrors.delete(exerciseId);
      }
    } catch (e: any) {
      this.jsonErrors.set(exerciseId, 'Invalid JSON syntax: ' + (e.message || 'Invalid format'));
    }
  }

  private validateJsonStructure(json: any, activityTypeId: number): string | null {
    if (!activityTypeId || activityTypeId <= 0) {
      return 'Please select an Activity Type first';
    }

    // Validate based on activity type
    switch (activityTypeId) {
      case 1: // Flashcard
        return this.validateFlashcardStructure(json);
      case 2: // Matching
        return this.validateMatchingStructure(json);
      case 3: // Fill in the Blanks
        return this.validateFillInTheBlanksStructure(json);
      case 4: // MCQ
        return this.validateMCQStructure(json);
      case 5: // True/False
        return this.validateTrueFalseStructure(json);
      case 6: // Song Player
        return this.validateSongPlayerStructure(json);
      case 7: // Story Player
        return this.validateStoryPlayerStructure(json);
      case 8: // Pronunciation
        return this.validatePronunciationStructure(json);
      case 9: // Scramble
        return this.validateScrambleStructure(json);
      case 10: // Triple Blast
        return this.validateTripleBlastStructure(json);
      case 11: // Bubble Blast
        return this.validateBubbleBlastStructure(json);
      case 12: // Memory Pair
        return this.validateMemoryPairStructure(json);
      case 13: // Group Sorter
        return this.validateGroupSorterStructure(json);
      default:
        return null; // Unknown activity type, allow any structure
    }
  }

  private validateFlashcardStructure(json: any): string | null {
    if (!json.id || typeof json.id !== 'string') {
      return 'Missing or invalid "id" field (must be string)';
    }
    if (!json.word || typeof json.word !== 'object') {
      return 'Missing or invalid "word" field (must be object with ta/en/si)';
    }
    if (!json.word.ta && !json.word.en && !json.word.si) {
      return 'Missing "word" multilingual fields (at least one of ta/en/si required)';
    }
    if (!json.audioUrl || typeof json.audioUrl !== 'object') {
      return 'Missing or invalid "audioUrl" field (must be object with ta/en/si)';
    }
    if (!json.audioUrl.ta && !json.audioUrl.en && !json.audioUrl.si) {
      return 'Missing "audioUrl" multilingual fields (at least one of ta/en/si required)';
    }
    // Optional fields validation
    if (json.label && typeof json.label !== 'object') {
      return 'Invalid "label" field (must be object with ta/en/si or null)';
    }
    if (json.referenceTitle && typeof json.referenceTitle !== 'object') {
      return 'Invalid "referenceTitle" field (must be object with ta/en/si or null)';
    }
    if (json.imageUrl && typeof json.imageUrl !== 'object') {
      return 'Invalid "imageUrl" field (must be object)';
    }
    return null; // Valid structure
  }

  private validateMatchingStructure(json: any): string | null {
    // Add matching validation logic
    return null;
  }

  private validateFillInTheBlanksStructure(json: any): string | null {
    // Add fill in the blanks validation logic
    return null;
  }

  private validateMCQStructure(json: any): string | null {
    // Add MCQ validation logic
    return null;
  }

  private validateTrueFalseStructure(json: any): string | null {
    // Add True/False validation logic
    return null;
  }

  private validateSongPlayerStructure(json: any): string | null {
    // Add Song Player validation logic
    return null;
  }

  private validateStoryPlayerStructure(json: any): string | null {
    // Add Story Player validation logic
    return null;
  }

  private validatePronunciationStructure(json: any): string | null {
    // Add Pronunciation validation logic
    return null;
  }

  private validateScrambleStructure(json: any): string | null {
    // Add Scramble validation logic
    return null;
  }

  private validateTripleBlastStructure(json: any): string | null {
    // Add Triple Blast validation logic
    return null;
  }

  private validateBubbleBlastStructure(json: any): string | null {
    // Add Bubble Blast validation logic
    return null;
  }

  private validateMemoryPairStructure(json: any): string | null {
    // Add Memory Pair validation logic
    return null;
  }

  private validateGroupSorterStructure(json: any): string | null {
    // Add Group Sorter validation logic
    return null;
  }

  saveExercise(exercise: Exercise): void {
    const exerciseId = exercise.id;
    const editedJson = this.editingExercises.get(exerciseId);
    
    if (!editedJson) return;

    try {
      // Validate JSON syntax
      const parsed = JSON.parse(editedJson);
      
      // Validate JSON structure against activity type
      const structureError = this.validateJsonStructure(parsed, this.activityTypeId);
      if (structureError) {
        this.jsonErrors.set(exerciseId, structureError);
        this.snackBar.open(structureError, 'Close', { duration: 5000 });
        return;
      }
      
      // All validations passed
      this.jsonErrors.delete(exerciseId);
      
      // Emit update event
      this.updateExercise.emit({ exerciseId, jsonData: editedJson });
      
      // Clear editing state
      this.editingExercises.delete(exerciseId);
    } catch (e: any) {
      const errorMsg = 'Invalid JSON syntax: ' + (e.message || 'Invalid format');
      this.jsonErrors.set(exerciseId, errorMsg);
      this.snackBar.open(errorMsg, 'Close', { duration: 3000 });
    }
  }

  onAddExercise(): void {
    this.addExercise.emit();
  }

  onDeleteExercise(exercise: Exercise, event: Event): void {
    event.stopPropagation();
    this.deleteExercise.emit(exercise.id);
  }

  onPreviewExercise(exercise: Exercise, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    // Use editing version if available, otherwise use saved version
    const jsonToPreview = this.editingExercises.get(exercise.id) || exercise.jsonData;
    
    try {
      // Validate the JSON before emitting
      JSON.parse(jsonToPreview);
      this.previewExercise.emit(jsonToPreview);
    } catch (error) {
      console.error('Invalid JSON for preview:', error);
      this.snackBar.open('Cannot preview invalid JSON', 'Close', { duration: 2000 });
    }
  }

  async onCopyExercise(exercise: Exercise, event: Event): Promise<void> {
    event.stopPropagation();
    const jsonToCopy = this.editingExercises.get(exercise.id) || exercise.jsonData;
    
    try {
      await navigator.clipboard.writeText(jsonToCopy);
      this.snackBar.open('Exercise JSON copied to clipboard!', 'Close', { duration: 2500 });
    } catch {
      const ta = document.createElement('textarea');
      ta.value = jsonToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.snackBar.open('Exercise JSON copied to clipboard!', 'Close', { duration: 2500 });
    }
  }

  onExpansionChange(index: number, isExpanded: boolean): void {
    this.expansionChange.emit({ index, isExpanded });
  }

  isDraft(exercise: Exercise): boolean {
    return (exercise as any).isDraft === true || exercise.id < 0 || !exercise.activityId;
  }
}