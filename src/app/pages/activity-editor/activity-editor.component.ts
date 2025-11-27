import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { DevicePreviewComponent } from '../../components/activities/device-preview/device-preview.component';
import { ExerciseEditorComponent } from '../../components/activities/exercise-editor/exercise-editor.component';
import { MultilingualActivityTemplates } from '../../services/multilingual-activity-templates.service';
import { ActivityApiService, MultilingualActivity } from '../../services/activity-api.service';
import { MainActivityApiService, MainActivityResponse } from '../../services/main-activity-api.service';
import { ActivityTypeApiService, ActivityTypeResponse } from '../../services/activity-type-api.service';
import { ExerciseApiService, Exercise, CreateExerciseDto } from '../../services/exercise-api.service';
import { Activity } from '../../types/activity.types';
import { MainActivity } from '../../types/main-activity.types';
import { ActivityType } from '../../types/activity-type.types';
import { MultilingualText } from '../../types/multilingual.types';
import { Subscription } from 'rxjs';

// ========== CONSTANTS ==========
const MAIN_ACTIVITY_ALLOWED_TYPES: Record<string, string[]> = {
  learning: ['Flash Card'],
  practice: [
    'Matching',
    'Fill in the blanks',
    'MCQ Activity',
    'True / False',
    'Scrumble Activity',
    'Memory Pair Activity'
  ],
  listening: ['Song Player', 'Story Player', 'Pronunciation Activity'],
  games: ['Triple Blast Activity', 'Bubble Blast Activity', 'Group Sorter Activity'],
  videos: [],
  conversations: []
};

const DRAFT_EXERCISE_ID_START = -1;
const DEFAULT_NO_SELECTION = 0;
const SNACKBAR_DURATION_SHORT = 1500;
const SNACKBAR_DURATION_MEDIUM = 3000;
const SNACKBAR_DURATION_LONG = 5000;

// ========== UTILITY FUNCTIONS ==========
const normalizeString = (value?: string | null): string => {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
};

interface ActivityCreateDto {
  title: MultilingualText;
  sequenceOrder: number;
  contentJson: string;
  lessonId: number;
  activityTypeId: number;
  mainActivityId: number;
}

@Component({
  selector: 'app-activity-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatGridListModule,
    DevicePreviewComponent,
    ExerciseEditorComponent,
  ],
  templateUrl: './activity-editor.component.html',
  styleUrls: ['./activity-editor.component.css']
})
export class ActivityEditorPageComponent implements OnInit, OnDestroy {
  // ========== PUBLIC PROPERTIES ==========
  activityId: string | null = null;
  lessonId: string | null = null;
  isEditMode = false;
  
  activity: Partial<MultilingualActivity> | null = null;
  previewContent: Partial<MultilingualActivity> | null = null;
  exercises: Exercise[] = [];
  isLoading = true;
  expandedExercise: number | false = false;
  readonly exercisePageSize = 10;
  
  mainActivities: MainActivity[] = [];
  filteredActivityTypes: ActivityType[] = [];
  currentActivityTypeForDisplay: ActivityType | null = null;
  selectedMainActivityName: string | null = null;
  isMainActivityNotAvailable = false;
  
  // ========== PRIVATE PROPERTIES ==========
  private routeSubscription?: Subscription;
  private lastActivityTypeId: number | null = null;
  private lastMainActivityId: number | null = null;
  private readonly activityTypeCache = new Map<number, ActivityType[]>();
  private tempExerciseIdCounter = DRAFT_EXERCISE_ID_START;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activityApiService: ActivityApiService,
    private mainActivityApiService: MainActivityApiService,
    private activityTypeApiService: ActivityTypeApiService,
    private exerciseApiService: ExerciseApiService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.subscribe(async params => {
      this.activityId = params['activityId'];
      this.lessonId = params['lessonId'];
      this.isEditMode = !!this.activityId;
      await this.loadData();
      this.handleRouteParams(params);
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  // ========== GETTERS ==========
  get hasExercises(): boolean {
    return !!(this.exercises && this.exercises.length > 0);
  }

  get hasDraftExercises(): boolean {
    return this.exercises?.some(ex => this.isDraftExercise(ex)) ?? false;
  }

  get isExerciseInteractionLocked(): boolean {
    return this.expandedExercise !== false || this.hasDraftExercises;
  }

  get isStructureSelectionLocked(): boolean {
    return this.hasExercises || this.isExerciseInteractionLocked;
  }

  get mainActivityLockMessage(): string | null {
    if (this.hasExercises) {
      return 'Main Activity cannot be changed while exercises exist.';
    }
    if (this.isExerciseInteractionLocked) {
      return 'Finish editing or adding exercises before changing the Main Activity.';
    }
    return null;
  }

  get activityTypeLockMessage(): string | null {
    if (this.hasExercises) {
      return 'Activity type cannot be changed while exercises exist.';
    }
    if (this.isExerciseInteractionLocked) {
      return 'Finish editing or adding exercises before changing the Activity Type.';
    }
    return null;
  }

  // ========== PRIVATE HELPER METHODS ==========
  
  /**
   * Convert any value to a number with fallback
   */
  private toNumber(value: any, fallback: number = DEFAULT_NO_SELECTION): number {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  }

  /**
   * Parse first exercise from JSON array safely
   */
  private parseFirstExerciseJson(jsonString: string): string {
    try {
      const parsed = JSON.parse(jsonString || '[]');
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const first = arr[0] || {};
      return JSON.stringify(first, null, 2);
    } catch {
      return '{}';
    }
  }

  /**
   * Check if main activity selection has changed
   */
  private hasMainActivityChanged(
    newId: number | null,
    previousId: number,
    lastTrackedId: number | null
  ): boolean {
    if (!newId || newId <= 0) return false;
    
    const isFirstSelection = lastTrackedId === null && newId > 0;
    const isChanged = previousId !== newId;
    
    return isFirstSelection || isChanged;
  }

  /**
   * Handle route query parameters
   */
  private handleRouteParams(params: any): void {
    if (params['editExerciseId']) {
      const exerciseId = this.toNumber(params['editExerciseId']);
      const exerciseIndex = this.exercises.findIndex(ex => ex.id === exerciseId);
      if (exerciseIndex !== -1) {
        this.expandedExercise = exerciseIndex;
      }
    } else if (params['previewExerciseId']) {
      const exerciseId = this.toNumber(params['previewExerciseId']);
      const exercise = this.exercises.find(ex => ex.id === exerciseId);
      if (exercise) {
        this.handlePreviewExercise(exercise.jsonData);
      }
    } else if (params['addExercise']) {
      setTimeout(() => {
        this.expandedExercise = false;
      }, 500);
    }
  }

  /**
   * Load initial data from APIs
   */
  private async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      const mainActivitiesPromise = this.mainActivityApiService.getAll().toPromise();
      const activityPromise = this.getActivityPromise();

      const [mainActs, loadedActivity] = await Promise.all([
        mainActivitiesPromise,
        activityPromise,
      ]);

      this.mapMainActivities(mainActs);
      this.filteredActivityTypes = [];

      if (this.isEditMode && this.activityId) {
        await this.loadExercises();
      } else {
        this.exercises = [];
      }

      this.initializeActivity(loadedActivity);
    } catch (error) {
      this.snackBar.open('Failed to load data', 'Close', { duration: SNACKBAR_DURATION_LONG });
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Get activity promise based on edit mode
   */
  private getActivityPromise(): Promise<Partial<MultilingualActivity>> {
    if (this.isEditMode && this.activityId) {
      return this.activityApiService.getById(this.toNumber(this.activityId)).toPromise() as Promise<Partial<MultilingualActivity>>;
    }
    
    return Promise.resolve({
      title: { ta: '', en: '', si: '' },
      sequenceOrder: 1,
      mainActivityId: 0,
      activityTypeId: 0,
      contentJson: '[{}]',
      lessonId: this.toNumber(this.lessonId)
    });
  }

  /**
   * Map main activities from API response
   */
  private mapMainActivities(mainActs: MainActivityResponse[] | null | undefined): void {
    this.mainActivities = (mainActs || []).map(ma => ({
      id: ma.id,
      name: ma.name_en || ma.name_ta || ma.name_si || '',
      title: { ta: ma.name_ta, en: ma.name_en, si: ma.name_si },
      description: undefined
    }));
  }

  /**
   * Load exercises for edit mode
   */
  private async loadExercises(): Promise<void> {
    if (!this.activityId) return;
    
    try {
      const exercisesData = await this.exerciseApiService
        .getByActivityId(this.toNumber(this.activityId))
        .toPromise();
      this.exercises = exercisesData || [];
      this.normalizeExpandedExercise();
    } catch (error) {
      this.exercises = [];
    }
  }

  /**
   * Initialize activity with loaded data
   */
  private async initializeActivity(loadedActivity: Partial<MultilingualActivity> | null): Promise<void> {
    if (!loadedActivity) {
      this.activity = this.createDefaultActivity();
      return;
    }

    // Coerce all IDs to numbers
    this.activity = {
      ...loadedActivity,
      mainActivityId: this.toNumber(loadedActivity.mainActivityId),
      activityTypeId: this.toNumber(loadedActivity.activityTypeId),
      lessonId: this.toNumber(loadedActivity.lessonId),
      sequenceOrder: this.toNumber(loadedActivity.sequenceOrder, 1)
    };

    // Set preview content
    this.updatePreviewContent();

    // Track initial type
    this.lastActivityTypeId = this.toNumber(this.activity.activityTypeId) || null;

    // Auto-populate template for new activities
    if (!this.isEditMode && this.activity.activityTypeId && this.activity.activityTypeId > 0) {
      this.autoPopulateTemplate(this.activity.activityTypeId);
    }

    // Ensure no default main activity for new activities
    if (!this.isEditMode) {
      this.activity.mainActivityId = DEFAULT_NO_SELECTION;
    }

    // Handle main activity filtering
    await this.handleMainActivityInitialization();
  }

  /**
   * Handle main activity filtering on initialization
   */
  private async handleMainActivityInitialization(): Promise<void> {
    if (!this.activity) return;

    const mainActivityId = this.activity.mainActivityId || DEFAULT_NO_SELECTION;
    this.lastMainActivityId = mainActivityId > 0 ? mainActivityId : null;

    if (mainActivityId <= 0) {
      this.filteredActivityTypes = [];
      return;
    }

    this.evaluateMainActivityAvailability(mainActivityId);

    if (this.isMainActivityNotAvailable) {
      this.filteredActivityTypes = [];
      this.activity.activityTypeId = DEFAULT_NO_SELECTION;
    } else {
      await this.applyActivityTypeFilter(mainActivityId);
      this.validateCurrentActivityType();
    }
  }

  /**
   * Validate if current activity type is still valid
   */
  private async validateCurrentActivityType(): Promise<void> {
    if (!this.activity) return;

    const currentTypeId = this.toNumber(this.activity.activityTypeId);
    const isValid = currentTypeId > 0 && this.filteredActivityTypes.some(at => at.activityTypeId === currentTypeId);

    if (!isValid) {
      if (this.hasExercises && currentTypeId > 0) {
        await this.loadCurrentActivityTypeForDisplay(currentTypeId);
      } else {
        this.activity.activityTypeId = DEFAULT_NO_SELECTION;
      }
    } else {
      this.currentActivityTypeForDisplay = null;
    }
  }

  /**
   * Create default activity object
   */
  private createDefaultActivity(): Partial<MultilingualActivity> {
    return {
      title: { ta: '', en: '', si: '' },
      sequenceOrder: 1,
      mainActivityId: DEFAULT_NO_SELECTION,
      activityTypeId: DEFAULT_NO_SELECTION,
      contentJson: '[]',
      lessonId: this.toNumber(this.lessonId)
    };
  }

  /**
   * Update preview content with first exercise
   */
  private updatePreviewContent(): void {
    if (!this.activity) return;

    if (this.hasExercises) {
      const firstExercise = this.exercises[0];
      this.previewContent = {
        ...this.activity,
        contentJson: firstExercise.jsonData
      };
    } else {
      this.previewContent = { ...this.activity, contentJson: '{}' };
    }
  }

  /**
   * Get main activity key for lookup
   */
  private getMainActivityKey(mainActivityId: number): string | null {
    const mainActivity = this.mainActivities.find(ma => ma.id === mainActivityId);
    if (!mainActivity) return null;

    const raw = mainActivity.name || mainActivity.title?.en || mainActivity.title?.ta || mainActivity.title?.si || '';
    const normalized = normalizeString(raw);

    // Check exact normalized match
    if (normalized && MAIN_ACTIVITY_ALLOWED_TYPES[normalized]) {
      return normalized;
    }

    // Try to find matching key
    const keys = Object.keys(MAIN_ACTIVITY_ALLOWED_TYPES);
    for (const key of keys) {
      if (normalizeString(key) === normalized) {
        return key;
      }
    }

    return null;
  }

  /**
   * Get allowed activity type names for main activity
   */
  private getAllowedNamesSnapshot(mainActivityId: number): string[] | null {
    const key = this.getMainActivityKey(mainActivityId);
    return key ? MAIN_ACTIVITY_ALLOWED_TYPES[key] ?? null : null;
  }

  /**
   * Evaluate main activity availability
   */
  private evaluateMainActivityAvailability(mainActivityId: number): string[] | null {
    if (!mainActivityId || mainActivityId <= 0) {
      this.isMainActivityNotAvailable = false;
      this.selectedMainActivityName = null;
      return null;
    }

    const allowedNames = this.getAllowedNamesSnapshot(mainActivityId);
    this.selectedMainActivityName = this.getMainActivityKey(mainActivityId);

    // Mark as unavailable only if empty array (videos/conversations)
    this.isMainActivityNotAvailable = allowedNames !== null && allowedNames.length === 0;

    return allowedNames;
  }

  /**
   * Apply activity type filter based on main activity
   */
  private async applyActivityTypeFilter(mainActivityId: number): Promise<void> {
    const numericMainActivityId = this.toNumber(mainActivityId);

    if (numericMainActivityId <= 0) {
      this.filteredActivityTypes = [];
      return;
    }

    // Check cache first
    if (this.activityTypeCache.has(numericMainActivityId)) {
      const cachedTypes = this.activityTypeCache.get(numericMainActivityId)!;
      this.filteredActivityTypes = [...cachedTypes];
      return;
    }

    // Try to fetch from API
    try {
      const filteredDtos = await this.activityTypeApiService
        .getByMainActivity(numericMainActivityId)
        .toPromise();
      
      this.handleActivityTypeFilterSuccess(numericMainActivityId, filteredDtos);
    } catch (error) {
      // Fallback to loading all types
      await this.fallbackLoadAllActivityTypes(numericMainActivityId);
    }
  }

  /**
   * Handle successful activity type filter response
   */
  private handleActivityTypeFilterSuccess(
    mainActivityId: number,
    filteredDtos: ActivityTypeResponse[] | null | undefined
  ): void {
    if (!filteredDtos || filteredDtos.length === 0) {
      this.filteredActivityTypes = [];
      this.activityTypeCache.set(mainActivityId, []);
      return;
    }

    const mappedTypes = this.mapActivityTypes(filteredDtos);
    this.activityTypeCache.set(mainActivityId, mappedTypes);
    this.filteredActivityTypes = [...mappedTypes];
  }

  /**
   * Fallback: load all activity types when filtered endpoint fails
   */
  private async fallbackLoadAllActivityTypes(mainActivityId: number): Promise<void> {
    try {
      const allTypes = await this.activityTypeApiService.getAll().toPromise();

      if (!allTypes || allTypes.length === 0) {
        this.handleActivityTypesLoadFailure(mainActivityId);
        return;
      }

      const filtered = allTypes.filter(at => at.mainActivityId === mainActivityId);
      
      if (filtered.length === 0) {
        this.snackBar.open('No activity types available for this main activity.', 'Close', { duration: SNACKBAR_DURATION_LONG });
        this.filteredActivityTypes = [];
        this.activityTypeCache.set(mainActivityId, []);
        return;
      }

      const mappedTypes = this.mapActivityTypes(filtered);
      this.activityTypeCache.set(mainActivityId, mappedTypes);
      this.filteredActivityTypes = [...mappedTypes];
      this.snackBar.open('Activity types loaded (fallback method)', 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
    } catch (error) {
      this.handleActivityTypesLoadFailure(mainActivityId);
    }
  }

  /**
   * Handle activity type loading failure
   */
  private handleActivityTypesLoadFailure(mainActivityId: number): void {
    this.filteredActivityTypes = [];
    this.activityTypeCache.set(mainActivityId, []);
    this.snackBar.open('Failed to load activity types.', 'Close', { duration: SNACKBAR_DURATION_LONG });
  }

  /**
   * Map activity type DTOs to local model
   */
  private mapActivityTypes(dtos: ActivityTypeResponse[]): ActivityType[] {
    return dtos.map(at => ({
      activityTypeId: at.id,
      activityName: at.name_en || at.name_ta || at.name_si || '',
      title: { ta: at.name_ta, en: at.name_en, si: at.name_si },
      description: undefined
    }));
  }

  /**
   * Load current activity type for display when exercises exist
   */
  private async loadCurrentActivityTypeForDisplay(activityTypeId: number): Promise<void> {
    try {
      const allTypes = await this.activityTypeApiService.getAll().toPromise();
      if (!allTypes) return;

      const currentType = allTypes.find(at => at.id === activityTypeId);
      if (currentType) {
        this.currentActivityTypeForDisplay = {
          activityTypeId: currentType.id,
          activityName: currentType.name_en || currentType.name_ta || currentType.name_si || '',
          title: { ta: currentType.name_ta, en: currentType.name_en, si: currentType.name_si },
          description: undefined
        };
        this.cdr.detectChanges();
      }
    } catch (error) {
      this.currentActivityTypeForDisplay = null;
    }
  }

  /**
   * Get display activity types (includes non-filtered types when exercises exist)
   */
  getDisplayActivityTypes(): ActivityType[] {
    if (this.hasExercises && this.currentActivityTypeForDisplay) {
      const isInFiltered = this.filteredActivityTypes.some(
        at => at.activityTypeId === this.currentActivityTypeForDisplay!.activityTypeId
      );
      if (!isInFiltered) {
        return [...this.filteredActivityTypes, this.currentActivityTypeForDisplay];
      }
    }
    return this.filteredActivityTypes;
  }

  // ========== FORM HANDLERS ==========

  async handleFormChange(updatedActivityData: Partial<MultilingualActivity>): Promise<void> {
    const previousTypeId = this.lastActivityTypeId;
    const previousMainActivityId = this.lastMainActivityId ?? (this.activity?.mainActivityId || DEFAULT_NO_SELECTION);
    const nextTypeId = this.toNumber(updatedActivityData.activityTypeId ?? this.activity?.activityTypeId);

    // Merge data
    const mergedData = this.mergeActivityData(updatedActivityData);
    this.activity = mergedData;

    // Check main activity change
    const newMainActivityId = this.toNumber(mergedData.mainActivityId);
    const mainActivityChanged = this.hasMainActivityChanged(newMainActivityId > 0 ? newMainActivityId : null, previousMainActivityId, this.lastMainActivityId);

    if (mainActivityChanged) {
      await this.handleMainActivityChange(newMainActivityId);
    } else if (updatedActivityData.mainActivityId !== undefined) {
      this.lastMainActivityId = newMainActivityId > 0 ? newMainActivityId : null;
    }

    // Handle activity type change
    if (nextTypeId && nextTypeId > 0 && previousTypeId !== nextTypeId && !this.isMainActivityNotAvailable) {
      if (this.hasExercises) {
        this.activity.activityTypeId = previousTypeId || DEFAULT_NO_SELECTION;
        this.snackBar.open('Activity type cannot be changed when exercises exist.', 'Close', { duration: SNACKBAR_DURATION_LONG });
        return;
      }
      this.autoPopulateTemplate(nextTypeId);
    }

    this.lastActivityTypeId = nextTypeId || null;
  }

  /**
   * Merge updated activity data with existing data
   */
  private mergeActivityData(updatedActivityData: Partial<MultilingualActivity>): Partial<MultilingualActivity> {
    const current = this.activity || this.createDefaultActivity();
    const merged = { ...current, ...updatedActivityData };

    // Coerce all numeric fields
    merged.mainActivityId = this.toNumber(merged.mainActivityId);
    merged.activityTypeId = this.toNumber(merged.activityTypeId);
    merged.lessonId = this.toNumber(merged.lessonId);
    merged.sequenceOrder = this.toNumber(merged.sequenceOrder, 1);

    return merged;
  }

  /**
   * Handle main activity change
   */
  private async handleMainActivityChange(newMainActivityId: number): Promise<void> {
    if (newMainActivityId <= 0) return;

    this.lastMainActivityId = newMainActivityId;
    this.evaluateMainActivityAvailability(newMainActivityId);

    if (this.isMainActivityNotAvailable) {
      this.filteredActivityTypes = [];
      if (this.activity) {
        this.activity.activityTypeId = DEFAULT_NO_SELECTION;
      }
    } else {
      await this.applyActivityTypeFilter(newMainActivityId);
      this.cdr.detectChanges();
      this.validateCurrentActivityType();
    }
  }

  /**
   * Auto-populate template for activity type
   */
  private autoPopulateTemplate(activityTypeId: number): void {
    if (!activityTypeId || activityTypeId <= 0) return;

    try {
      const templateString = MultilingualActivityTemplates.getTemplate(activityTypeId);
      const templateObject = JSON.parse(templateString);

      if (this.activity) {
        this.activity.activityTypeId = activityTypeId;
        this.previewContent = {
          ...this.activity,
          contentJson: JSON.stringify(templateObject, null, 2)
        };
      }
      this.expandedExercise = false;

      const activityType = this.filteredActivityTypes.find(at => at.activityTypeId === activityTypeId);
      const activityTypeName = activityType?.activityName ?? 'selected';
      this.snackBar.open(`Template for ${activityTypeName} loaded.`, 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
    } catch (error) {
      this.snackBar.open('Failed to load template.', 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
    }
  }

  // ========== PREVIEW & PREVIEW HANDLERS ==========

  handlePreviewExercise(exerciseJsonString: string): void {
    if (!this.activity) return;

    try {
      JSON.parse(exerciseJsonString);
      this.previewContent = { ...this.activity, contentJson: exerciseJsonString };
      this.snackBar.open('Preview updated', 'Close', { duration: SNACKBAR_DURATION_SHORT });
    } catch (error) {
      this.snackBar.open('Invalid JSON - preview not updated', 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
    }
  }

  onJsonChanged(value: string): void {
    try {
      const firstExerciseJson = this.parseFirstExerciseJson(value);
      this.previewContent = this.activity ? { ...this.activity, contentJson: firstExerciseJson } : null;
    } catch {
      // Ignore typing errors
    }
  }

  applyJsonToPreview(): void {
    if (!this.activity) return;

    try {
      const firstExerciseJson = this.parseFirstExerciseJson(this.activity.contentJson || '[]');
      this.previewContent = { ...this.activity, contentJson: firstExerciseJson };
      this.snackBar.open('Preview updated from JSON', 'Close', { duration: SNACKBAR_DURATION_SHORT });
    } catch {
      this.snackBar.open('Invalid JSON - preview not updated', 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
    }
  }

  // ========== JSON FORMATTING & VALIDATION ==========

  formatJson(): void {
    if (!this.activity) return;

    try {
      const parsed = JSON.parse(this.activity.contentJson || '[]');
      this.activity.contentJson = JSON.stringify(parsed, null, 2);
      this.snackBar.open('JSON formatted', 'Close', { duration: SNACKBAR_DURATION_SHORT });
    } catch (e) {
      this.snackBar.open('Invalid JSON - cannot format', 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
    }
  }

  validateJson(): void {
    if (!this.activity) return;

    try {
      JSON.parse(this.activity.contentJson || '[]');
      this.snackBar.open('JSON is valid', 'Close', { duration: SNACKBAR_DURATION_SHORT });
    } catch (e: any) {
      this.snackBar.open(`Invalid JSON: ${e?.message || ''}`.trim(), 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
    }
  }

  async handleCopyTemplate(): Promise<void> {
    try {
      const typeId = this.toNumber(this.activity?.activityTypeId);
      if (!typeId || typeId <= 0) {
        this.snackBar.open('Select an Activity Type first.', 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
        return;
      }

      const templateJson = this.getActivityTemplate(typeId);
      await this.copyToClipboard(templateJson);
      this.snackBar.open('Template JSON copied!', 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
    } catch (error) {
      this.snackBar.open('Failed to copy template.', 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
    }
  }

  /**
   * Copy text to clipboard with fallback
   */
  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  getActivityTemplate(activityTypeId: number): string {
    if (!activityTypeId || activityTypeId <= 0) {
      return '{}';
    }
    return MultilingualActivityTemplates.getTemplate(activityTypeId);
  }

  // ========== EXERCISE CRUD ==========

  async handleAddExercise(): Promise<void> {
    const typeId = this.toNumber(this.activity?.activityTypeId);
    const jsonTemplate = this.getActivityTemplate(typeId);

    if (!this.activityId) {
      await this.addDraftExercise(jsonTemplate);
      return;
    }

    await this.addPersistentExercise(jsonTemplate);
  }

  /**
   * Add draft exercise for unsaved activity
   */
  private async addDraftExercise(jsonTemplate: string): Promise<void> {
    const tempId = this.tempExerciseIdCounter--;
    const now = new Date().toISOString();
    const draftExercise = {
      id: tempId,
      activityId: 0,
      jsonData: jsonTemplate,
      sequenceOrder: this.exercises.length + 1,
      createdAt: now,
      updatedAt: now,
      isDraft: true
    } as Exercise & { isDraft: true };

    this.exercises = [...this.exercises, draftExercise];
    this.normalizeExpandedExercise();
    this.expandedExercise = this.exercises.length - 1;

    const currentTypeId = this.toNumber(this.activity?.activityTypeId);
    if (currentTypeId > 0 && !this.filteredActivityTypes.some(at => at.activityTypeId === currentTypeId)) {
      await this.loadCurrentActivityTypeForDisplay(currentTypeId);
    }

    this.cdr.detectChanges();
    this.snackBar.open('Draft exercise created. Save activity to persist.', 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
  }

  /**
   * Add persistent exercise to database
   */
  private async addPersistentExercise(jsonTemplate: string): Promise<void> {
    if (!this.activityId) return;

    const createDto: CreateExerciseDto = {
      activityId: this.toNumber(this.activityId),
      jsonData: jsonTemplate,
      sequenceOrder: this.exercises.length + 1
    };

    try {
      const newExercise = await this.exerciseApiService.create(createDto).toPromise();
      if (newExercise) {
        this.exercises.push(newExercise);
        this.normalizeExpandedExercise();
        this.expandedExercise = this.exercises.length - 1;

        const currentTypeId = this.toNumber(this.activity?.activityTypeId);
        if (currentTypeId > 0 && !this.filteredActivityTypes.some(at => at.activityTypeId === currentTypeId)) {
          await this.loadCurrentActivityTypeForDisplay(currentTypeId);
        }

        this.cdr.detectChanges();
        this.snackBar.open('Exercise added!', 'Close', { duration: SNACKBAR_DURATION_SHORT });
      }
    } catch (error) {
      this.snackBar.open('Failed to add exercise.', 'Close', { duration: SNACKBAR_DURATION_LONG });
    }
  }

  async handleUpdateExercise(exerciseId: number, jsonData: string): Promise<void> {
    const index = this.exercises.findIndex(ex => ex.id === exerciseId);
    if (index === -1) return;

    const targetExercise = this.exercises[index];

    if (this.isDraftExercise(targetExercise)) {
      this.exercises[index] = { ...targetExercise, jsonData, updatedAt: new Date().toISOString() };
      this.snackBar.open('Draft exercise updated!', 'Close', { duration: SNACKBAR_DURATION_SHORT });
      return;
    }

    try {
      JSON.parse(jsonData);
      await this.exerciseApiService.update(exerciseId, { jsonData }).toPromise();

      const updateIndex = this.exercises.findIndex(ex => ex.id === exerciseId);
      if (updateIndex !== -1) {
        this.exercises[updateIndex] = { ...this.exercises[updateIndex], jsonData };
      }

      this.snackBar.open('Exercise updated!', 'Close', { duration: SNACKBAR_DURATION_SHORT });
    } catch (error) {
      this.snackBar.open('Failed to update exercise. Check JSON format.', 'Close', { duration: SNACKBAR_DURATION_LONG });
    }
  }

  async handleDeleteExercise(exerciseId: number): Promise<void> {
    const index = this.exercises.findIndex(ex => ex.id === exerciseId);
    if (index === -1) return;

    const exercise = this.exercises[index];

    if (this.isDraftExercise(exercise)) {
      this.exercises = this.exercises.filter(ex => ex.id !== exerciseId);
      this.normalizeExpandedExercise();
      this.resequenceExercises();
      if (this.exercises.length === 0) {
        this.currentActivityTypeForDisplay = null;
      }
      this.cdr.detectChanges();
      this.snackBar.open('Draft exercise deleted.', 'Close', { duration: SNACKBAR_DURATION_SHORT });
      return;
    }

    const confirmed = confirm('Are you sure you want to delete this exercise?');
    if (!confirmed) return;

    try {
      await this.exerciseApiService.delete(exerciseId).toPromise();
      this.exercises = this.exercises.filter(ex => ex.id !== exerciseId);
      this.resequenceExercises();
      this.normalizeExpandedExercise();

      if (this.exercises.length === 0) {
        this.currentActivityTypeForDisplay = null;
      }

      this.cdr.detectChanges();
      this.snackBar.open('Exercise deleted!', 'Close', { duration: SNACKBAR_DURATION_SHORT });
    } catch (error) {
      this.snackBar.open('Failed to delete exercise.', 'Close', { duration: SNACKBAR_DURATION_LONG });
    }
  }

  // ========== PANEL & EXPANSION ==========

  handleExpansionChange(panelIndex: number): void {
    this.expandedExercise = this.expandedExercise === panelIndex ? false : panelIndex;
  }

  handleSetExpanded(index: number): void {
    this.expandedExercise = index;
  }

  // ========== FIELD UPDATERS ==========

  updateTitleField(code: 'ta' | 'en' | 'si', value: string): void {
    if (!this.activity) return;

    const currentTitle = this.activity.title || { ta: '', en: '', si: '' };
    const updatedTitle = { ...currentTitle, [code]: value };
    this.activity.title = updatedTitle;
    void this.handleFormChange({ title: updatedTitle });
  }

  updateSequenceOrder(value: number | string): void {
    if (!this.activity) return;

    const numericValue = this.toNumber(value, 1);
    this.activity.sequenceOrder = numericValue;
    void this.handleFormChange({ sequenceOrder: numericValue });
  }

  updateMainActivityId(value: number | string): void {
    if (!this.activity) return;

    if (this.isStructureSelectionLocked) {
      this.snackBar.open(this.mainActivityLockMessage || 'Cannot change Main Activity now.', 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
      return;
    }

    const numericValue = this.toNumber(value);
    this.activity.mainActivityId = numericValue;
    void this.handleFormChange({ mainActivityId: numericValue });
  }

  updateActivityTypeId(value: number | string): void {
    if (!this.activity) return;

    if (this.isStructureSelectionLocked) {
      this.snackBar.open(this.activityTypeLockMessage || 'Cannot change Activity Type now.', 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
      return;
    }

    const numericValue = this.toNumber(value);
    this.activity.activityTypeId = numericValue;
    void this.handleFormChange({ activityTypeId: numericValue });
  }

  // ========== SAVE & NAVIGATION ==========

  async handleSave(): Promise<void> {
    if (!this.activity) return;

    // Validate required fields
    const coercedLessonId = this.toNumber(this.activity.lessonId ?? this.lessonId);
    const coercedActivityTypeId = this.toNumber(this.activity.activityTypeId);
    const coercedMainActivityId = this.toNumber(this.activity.mainActivityId);

    if (!this.validateRequiredIds(coercedLessonId, coercedActivityTypeId, coercedMainActivityId)) {
      return;
    }

    const payload = this.buildActivityPayload(coercedLessonId, coercedActivityTypeId, coercedMainActivityId);

    try {
      const createdOrUpdated = await this.persistActivity(payload);

      if (createdOrUpdated?.activityId && !this.isEditMode) {
        this.activityId = createdOrUpdated.activityId.toString();
        this.isEditMode = true;
      }

      const persistedActivityId = createdOrUpdated?.activityId ?? (this.activityId ? this.toNumber(this.activityId) : undefined);
      const hasDrafts = this.exercises.some(ex => this.isDraftExercise(ex));

      if (hasDrafts && persistedActivityId) {
        await this.persistDraftExercises(persistedActivityId);
        await this.reloadExercises(persistedActivityId);
      }

      this.snackBar.open('Activity saved!', 'Close', { duration: SNACKBAR_DURATION_MEDIUM });
      this.navigateAfterSave(payload.lessonId, persistedActivityId);
    } catch (error) {
      this.snackBar.open('Failed to save activity.', 'Close', { duration: SNACKBAR_DURATION_LONG });
    }
  }

  /**
   * Validate required IDs before save
   */
  private validateRequiredIds(lessonId: number, activityTypeId: number, mainActivityId: number): boolean {
    if (!lessonId || lessonId <= 0) {
      this.snackBar.open('Please select a valid Lesson.', 'Close', { duration: SNACKBAR_DURATION_LONG });
      return false;
    }

    if (!activityTypeId || activityTypeId <= 0) {
      this.snackBar.open('Please select a valid Activity Type.', 'Close', { duration: SNACKBAR_DURATION_LONG });
      return false;
    }

    if (!mainActivityId || mainActivityId <= 0) {
      this.snackBar.open('Please select a valid Main Activity.', 'Close', { duration: SNACKBAR_DURATION_LONG });
      return false;
    }

    return true;
  }

  /**
   * Build activity payload for save
   */
  private buildActivityPayload(
    lessonId: number,
    activityTypeId: number,
    mainActivityId: number
  ): ActivityCreateDto {
    const enteredTitle = this.activity?.title || { ta: '', en: '', si: '' };
    let contentJsonToSave = '[]';

    if (this.hasExercises) {
      contentJsonToSave = this.buildExercisesJson();
    } else if (activityTypeId > 0) {
      contentJsonToSave = this.getActivityTemplate(activityTypeId);
    }

    return {
      title: {
        ta: (enteredTitle.ta || '').toString().trim(),
        en: (enteredTitle.en || '').toString().trim(),
        si: (enteredTitle.si || '').toString().trim()
      },
      sequenceOrder: this.toNumber(this.activity?.sequenceOrder, 1),
      contentJson: contentJsonToSave,
      lessonId,
      activityTypeId,
      mainActivityId
    };
  }

  /**
   * Build exercises JSON array
   */
  private buildExercisesJson(): string {
    try {
      const exercisesJsonArray = this.exercises
        .map(ex => {
          try {
            return JSON.parse(ex.jsonData);
          } catch {
            return null;
          }
        })
        .filter(json => json !== null);

      return JSON.stringify(exercisesJsonArray);
    } catch {
      return '[]';
    }
  }

  /**
   * Persist activity to API
   */
  private async persistActivity(payload: ActivityCreateDto): Promise<MultilingualActivity | undefined> {
    if (this.isEditMode && this.activityId) {
      return this.activityApiService.update(this.toNumber(this.activityId), payload).toPromise();
    }
    return this.activityApiService.create(payload).toPromise();
  }

  /**
   * Navigate after successful save
   */
  private navigateAfterSave(lessonId: number, activityId: number | undefined): void {
    if (lessonId && activityId) {
      this.router.navigate(['/activities'], { queryParams: { lessonId, previewId: activityId } });
    } else {
      this.goBack();
    }
  }

  goBack(): void {
    const lessonId = this.toNumber(this.activity?.lessonId ?? this.lessonId);
    if (lessonId) {
      this.router.navigate(['activities'], { queryParams: { lessonId } });
    } else {
      this.router.navigate(['levels']);
    }
  }

  // ========== PRIVATE UTILITY METHODS ==========

  private isDraftExercise(exercise: Exercise): exercise is Exercise & { isDraft?: boolean } {
    return (exercise as any).isDraft === true || exercise.id < 0 || !exercise.activityId;
  }

  private normalizeExpandedExercise(): void {
    if (!this.exercises.length) {
      this.expandedExercise = false;
      return;
    }

    if (this.expandedExercise === false) {
      return;
    }

    if (this.expandedExercise < 0) {
      this.expandedExercise = 0;
      return;
    }

    if (this.expandedExercise >= this.exercises.length) {
      this.expandedExercise = this.exercises.length - 1;
    }
  }

  private resequenceExercises(): void {
    this.exercises = this.exercises.map((exercise, index) => ({
      ...exercise,
      sequenceOrder: index + 1
    }));
  }

  private async persistDraftExercises(activityId: number): Promise<void> {
    const drafts = this.exercises.filter(ex => this.isDraftExercise(ex));
    if (drafts.length === 0) return;

    const replacementMap = new Map<number, Exercise>();

    for (const draft of drafts) {
      const createDto: CreateExerciseDto = {
        activityId,
        jsonData: draft.jsonData,
        sequenceOrder: draft.sequenceOrder
      };

      try {
        const created = await this.exerciseApiService.create(createDto).toPromise();
        if (created) {
          replacementMap.set(draft.id, created);
        }
      } catch (error) {
        this.snackBar.open('Failed to save a draft exercise.', 'Close', { duration: SNACKBAR_DURATION_LONG });
      }
    }

    if (replacementMap.size > 0) {
      this.exercises = this.exercises.map(exercise => {
        if (this.isDraftExercise(exercise)) {
          return replacementMap.get(exercise.id) ?? exercise;
        }
        return exercise;
      });
    }
  }

  private async reloadExercises(activityId: number): Promise<void> {
    try {
      const refreshed = await this.exerciseApiService.getByActivityId(activityId).toPromise();
      if (refreshed) {
        this.exercises = refreshed;
        this.normalizeExpandedExercise();
      }
    } catch (error) {
      // Silent fail
    }
  }
}