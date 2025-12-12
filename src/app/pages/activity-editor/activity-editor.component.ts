import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
// MatTypographyModule is not available in Angular Material v19
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
  activityTypes: ActivityType[] = [];
  filteredActivityTypes: ActivityType[] = [];
  currentActivityTypeForDisplay: ActivityType | null = null; // Store current activity type when exercises exist
  selectedMainActivityName: string | null = null;
  isMainActivityNotAvailable = false;
  
  // Debug: Load all activity types to check their mainActivityIds
  async debugLoadAllActivityTypes(): Promise<void> {
    // Debug function - no longer needed but kept for potential future use
    try {
      await this.activityTypeApiService.getAll().toPromise();
    } catch (error) {
      // Silently handle error
    }
  }
  
  private routeSubscription?: Subscription;
  private lastActivityTypeId: number | null = null;
  private lastMainActivityId: number | null = null; // Track previous main activity ID
  private readonly activityTypeCache = new Map<number, ActivityType[]>();
  private tempExerciseIdCounter = -1;

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
      
      // Handle special query params from exercises list
      if (params['editExerciseId']) {
        const exerciseId = parseInt(params['editExerciseId'], 10);
        const exerciseIndex = this.exercises.findIndex(ex => ex.id === exerciseId);
        if (exerciseIndex !== -1) {
          this.expandedExercise = exerciseIndex;
        }
      } else if (params['previewExerciseId']) {
        const exerciseId = parseInt(params['previewExerciseId'], 10);
        const exercise = this.exercises.find(ex => ex.id === exerciseId);
        if (exercise) {
          this.handlePreviewExercise(exercise.jsonData);
        }
      } else if (params['addExercise']) {
        // Scroll to exercises section or auto-expand add functionality
        setTimeout(() => {
          this.expandedExercise = false;
        }, 500);
      }
    });
  }

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
    // Lock main activity / activity type only after at least one exercise exists
    return this.hasExercises;
  }

  get mainActivityLockMessage(): string | null {
    if (this.hasExercises) {
      return 'Main Activity cannot be changed once exercises are added.';
    }
    return null;
  }

  get activityTypeLockMessage(): string | null {
    if (this.hasExercises) {
      return 'Activity Type cannot be changed once exercises are added.';
    }
    return null;
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  private async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      const mainActivitiesPromise = this.mainActivityApiService.getAll().toPromise();
      // Don't load all activity types - only load filtered types when main activity is selected
      // But load them for debugging purposes
      const debugLoadPromise = this.debugLoadAllActivityTypes();
      let activityPromise: Promise<Partial<MultilingualActivity>>;

      if (this.isEditMode && this.activityId) {
        activityPromise = this.activityApiService.getById(parseInt(this.activityId, 10)).toPromise() as Promise<Partial<MultilingualActivity>>;
      } else {
        activityPromise = Promise.resolve({
          title: { ta: '', en: '', si: '' },
          sequenceOrder: 1,
          mainActivityId: 0,
          activityTypeId: 0,
          contentJson: '[{}]',
          lessonId: parseInt(this.lessonId || '0', 10)
        });
      }

      const [mainActs, loadedActivity] = await Promise.all([
        mainActivitiesPromise,
        activityPromise,
        debugLoadPromise
      ]);

      this.mainActivities = (mainActs || []).map(ma => ({
        id: ma.id,
        name: ma.name_en || ma.name_ta || ma.name_si || '',
        title: { ta: ma.name_ta, en: ma.name_en, si: ma.name_si },
        description: undefined
      }));
      // Don't load all activity types - only load filtered types based on selected main activity
      this.activityTypes = [];
      // Don't set filteredActivityTypes here - it will be set after filtering based on main activity
      this.filteredActivityTypes = [];

      // Load exercises from Exercise API if editing an existing activity
      if (this.isEditMode && this.activityId) {
        const exercisesData = await this.exerciseApiService.getByActivityId(parseInt(this.activityId, 10)).toPromise();
        this.exercises = exercisesData || [];
        this.normalizeExpandedExercise();
      } else {
        // For new activities, start with an empty exercises array
        this.exercises = [];
        this.normalizeExpandedExercise();
      }

      if (loadedActivity) {
        // Ensure all IDs are properly converted to numbers
        if (loadedActivity.mainActivityId) {
          loadedActivity.mainActivityId = Number(loadedActivity.mainActivityId);
        }
        if (loadedActivity.activityTypeId) {
          loadedActivity.activityTypeId = Number(loadedActivity.activityTypeId);
        }
        if (loadedActivity.lessonId) {
          loadedActivity.lessonId = Number(loadedActivity.lessonId);
        }
        if (loadedActivity.sequenceOrder) {
          loadedActivity.sequenceOrder = Number(loadedActivity.sequenceOrder);
        }
        
        this.activity = loadedActivity;
        // Set preview to first exercise if available
        const firstExercise = this.exercises[0];
        if (firstExercise) {
          this.previewContent = { ...loadedActivity, contentJson: firstExercise.jsonData };
        } else {
          this.previewContent = { ...loadedActivity, contentJson: '{}' };
        }
        // Track initial type to detect changes later
        this.lastActivityTypeId = Number(loadedActivity.activityTypeId || 0) || null;
        
        // If this is a new activity and an activity type is already selected, auto-populate the template
        if (!this.isEditMode && this.activity.activityTypeId && this.activity.activityTypeId > 0) {
          this.autoPopulateTemplate(this.activity.activityTypeId);
        }

        // Don't set default main activity - let user choose manually
        if (!this.isEditMode) {
          // Ensure mainActivityId is 0 (not selected) for new activities
          if (this.activity) {
            this.activity.mainActivityId = 0;
          }
        }

        if (this.activity) {
          const mainActivityId = this.activity.mainActivityId || 0;
          // Track the initial main activity ID
          this.lastMainActivityId = mainActivityId > 0 ? mainActivityId : null;
          this.evaluateMainActivityAvailability(mainActivityId);
          if (this.isMainActivityNotAvailable) {
            this.filteredActivityTypes = [];
            this.activity.activityTypeId = 0;
          } else {
            await this.applyActivityTypeFilter(mainActivityId);
            
            // Check if current activity type is valid for the main activity
            const currentTypeId = this.activity.activityTypeId || 0;
            const isValid = currentTypeId > 0 && this.filteredActivityTypes.some(at => at.activityTypeId === currentTypeId);
            
            if (!isValid) {
              // If exercises exist, keep current type for display even if not in filtered list
              if (this.exercises && this.exercises.length > 0 && currentTypeId > 0) {
                await this.loadCurrentActivityTypeForDisplay(currentTypeId);
              } else {
                // Current activity type is not valid, clear selection - don't auto-select
                this.activity.activityTypeId = 0;
              }
            } else {
              // Current type is valid, clear stored type
              this.currentActivityTypeForDisplay = null;
            }
            // Don't auto-select activity type for new activities - let user choose manually
          }
        } else {
          // For new activities, initialize lastMainActivityId to null
          this.lastMainActivityId = null;
        }
      } else {
        // For new activities, set default main activity if none is selected
        if (!this.activity) {
          this.activity = {
            title: { ta: '', en: '', si: '' },
            sequenceOrder: 1,
            mainActivityId: 0,
            activityTypeId: 0,
            contentJson: '[]',
            lessonId: parseInt(this.lessonId || '0', 10)
          };
        }
        
        // Don't set default main activity - let user choose manually
        // Ensure mainActivityId is 0 (not selected) for new activities
        if (this.activity) {
          this.activity.mainActivityId = 0;
          this.activity.activityTypeId = 0;
        }
        
        // No main activity selected yet, show empty list
        this.filteredActivityTypes = [];
      }
    } catch (error) {
      this.snackBar.open('Failed to load data', 'Close', { duration: 5000 });
    } finally {
      this.isLoading = false;
    }
  }

  async handleFormChange(updatedActivityData: Partial<MultilingualActivity>): Promise<void> {
    const previousTypeId = this.lastActivityTypeId;
    
    // Get previous main activity ID BEFORE any merging
    // Use tracked ID first, if null then use current activity's ID, otherwise 0
    const previousMainActivityId = this.lastMainActivityId !== null ? this.lastMainActivityId : (this.activity?.mainActivityId || 0);
    const nextTypeId = Number(updatedActivityData.activityTypeId || (this.activity?.activityTypeId || 0));

    // Check if mainActivityId is in the updated data (means user changed it)
    const hasMainActivityIdInUpdate = updatedActivityData.mainActivityId !== undefined && updatedActivityData.mainActivityId !== null;
    const newMainActivityIdFromUpdate = hasMainActivityIdInUpdate ? Number(updatedActivityData.mainActivityId) : null;

    // Merge instead of replace to avoid losing required IDs
    const current = this.activity || {
      title: { ta: '', en: '', si: '' },
      sequenceOrder: 1,
      mainActivityId: 0,
      activityTypeId: 0,
      contentJson: '[]',
      lessonId: parseInt(this.lessonId || '0', 10)
    } as Partial<MultilingualActivity>;
    
    // Ensure all IDs are properly converted to numbers
    const mergedData = { ...current, ...updatedActivityData };
    if (mergedData.mainActivityId !== undefined && mergedData.mainActivityId !== null) {
      mergedData.mainActivityId = Number(mergedData.mainActivityId);
    }
    if (mergedData.activityTypeId !== undefined && mergedData.activityTypeId !== null) {
      mergedData.activityTypeId = Number(mergedData.activityTypeId);
    }
    if (mergedData.lessonId !== undefined && mergedData.lessonId !== null) {
      mergedData.lessonId = Number(mergedData.lessonId);
    }
    if (mergedData.sequenceOrder !== undefined && mergedData.sequenceOrder !== null) {
      mergedData.sequenceOrder = Number(mergedData.sequenceOrder);
    }
    
    // Check if main activity actually changed
    // If mainActivityId is in the update AND it's different from tracked previous, then it changed
    const newMainActivityId = mergedData.mainActivityId || 0;
    // For first time selection: if lastMainActivityId is null and we have a new value, it's a change
    // For subsequent changes: compare with previous value
    const isFirstTimeSelection = this.lastMainActivityId === null && newMainActivityIdFromUpdate !== null && newMainActivityIdFromUpdate > 0;
    const isSubsequentChange = hasMainActivityIdInUpdate && 
                                newMainActivityIdFromUpdate !== null && 
                                newMainActivityIdFromUpdate !== previousMainActivityId && 
                                newMainActivityIdFromUpdate > 0;
    const hasMainActivityChange = isFirstTimeSelection || isSubsequentChange;
    
    if (hasMainActivityChange) {
      this.evaluateMainActivityAvailability(mergedData.mainActivityId || 0);
    }
    
    // Ensure title is properly handled
    if (updatedActivityData.title) {
      mergedData.title = { ...updatedActivityData.title };
    }
    
    // Update activity data
    this.activity = mergedData;
    
    // Then check for main activity change and apply filter
    if (hasMainActivityChange && newMainActivityIdFromUpdate !== null && newMainActivityIdFromUpdate > 0) {
      // Update tracked main activity ID
      this.lastMainActivityId = newMainActivityIdFromUpdate;
      
      // First, evaluate if this main activity is available
      this.evaluateMainActivityAvailability(newMainActivityIdFromUpdate);
      
      if (this.isMainActivityNotAvailable) {
        this.filteredActivityTypes = [];
        this.activity.activityTypeId = 0;
        // Clear the preview as well
        if (this.previewContent) {
          this.previewContent.contentJson = '{}';
        }
      } else {
        // Immediately apply filter when main activity changes
        await this.applyActivityTypeFilter(newMainActivityIdFromUpdate);
        
        // Manually trigger change detection to ensure UI updates
        this.cdr.detectChanges();
        
        // ALWAYS reset activity type when main activity changes
        // Check if current activity type is valid for the new main activity
        const currentTypeId = this.activity.activityTypeId || 0;
        const isValid = currentTypeId > 0 && this.filteredActivityTypes.some(at => at.activityTypeId === currentTypeId);
        
        if (!isValid) {
          // Current activity type is not valid for new main activity
          // Don't auto-select - let user choose manually
          this.activity.activityTypeId = 0;
          if (this.previewContent) {
            this.previewContent.contentJson = '{}';
          }
        }
      }
    } else if (hasMainActivityIdInUpdate && newMainActivityIdFromUpdate !== null) {
      // Update tracked ID even if it didn't change (for consistency)
      this.lastMainActivityId = newMainActivityIdFromUpdate;
    }

    // Auto-generate template when activity type changes
    // Only auto-populate if we have a valid activity type ID
    // Don't allow activity type change if exercises exist
    if (nextTypeId && nextTypeId > 0 && previousTypeId !== nextTypeId && !this.isMainActivityNotAvailable) {
      // If exercises exist, prevent activity type change
      if (this.exercises && this.exercises.length > 0) {
        // Revert activity type to previous value
        this.activity.activityTypeId = previousTypeId || 0;
        this.snackBar.open('Activity type cannot be changed when exercises exist. Delete all exercises first.', 'Close', { duration: 5000 });
        return;
      }
      this.autoPopulateTemplate(nextTypeId);
    }

    this.lastActivityTypeId = nextTypeId || null;
  }

  private autoPopulateTemplate(activityTypeId: number): void {
    // Ensure we have a valid activity type ID
    if (!activityTypeId || activityTypeId <= 0) {
      return;
    }
    
    try {
      const templateString = MultilingualActivityTemplates.getTemplate(activityTypeId);
      const templateObject = JSON.parse(templateString);
      
      // Update activity type
      this.activity = { ...this.activity, activityTypeId: activityTypeId };

      // Update preview with template
      this.previewContent = this.activity ? { ...this.activity, contentJson: JSON.stringify(templateObject, null, 2) } : null;
      this.expandedExercise = 0;
      
      // Show a message to the user that the template has been auto-populated
      const activityType = this.filteredActivityTypes.find(at => at.activityTypeId === activityTypeId);
      const activityTypeName = activityType ? activityType.activityName : 'selected';
      this.snackBar.open(`Activity template for ${activityTypeName} loaded. Use "Add Exercise" to create exercises.`, 'Close', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Failed to load template.', 'Close', { duration: 3000 });
    }
  }

  private async applyActivityTypeFilter(mainActivityId: number): Promise<void> {
    if (!mainActivityId || mainActivityId <= 0) {
      this.filteredActivityTypes = [];
      return;
    }

    // Ensure mainActivityId is a valid number
    const numericMainActivityId = Number(mainActivityId);
    if (isNaN(numericMainActivityId) || numericMainActivityId <= 0) {
      this.filteredActivityTypes = [];
      return;
    }

    let usedCache = false;
    if (this.activityTypeCache.has(numericMainActivityId)) {
      usedCache = true;
      const cachedTypes = this.activityTypeCache.get(numericMainActivityId)!;
      this.filteredActivityTypes = [...cachedTypes]; // Create new array reference to trigger change detection
    } else {
      try {
        const filteredDtos = await this.activityTypeApiService.getByMainActivity(numericMainActivityId).toPromise();
        
        if (!filteredDtos || filteredDtos.length === 0) {
          this.filteredActivityTypes = [];
          this.activityTypeCache.set(numericMainActivityId, []);
          return;
        }
        
        const mappedTypes = filteredDtos.map(at => ({
          activityTypeId: at.id,
          activityName: at.name_en || at.name_ta || at.name_si || '',
          title: { ta: at.name_ta, en: at.name_en, si: at.name_si },
          description: undefined
        }));

        // Always use backend results - backend returns only activity types for this main activity
        if (mappedTypes.length > 0) {
          this.activityTypeCache.set(numericMainActivityId, mappedTypes);
          this.filteredActivityTypes = [...mappedTypes]; // Create new array reference to trigger change detection
        } else {
          // Backend returned empty - no activity types exist for this main activity
          this.filteredActivityTypes = [];
          this.activityTypeCache.set(numericMainActivityId, []);
        }
      } catch (error) {
        // Try fallback: load all activity types and filter client-side
        try {
          const allTypes = await this.activityTypeApiService.getAll().toPromise();
          
          if (allTypes && allTypes.length > 0) {
            // Filter by mainActivityId on client side
            const filtered = allTypes.filter(at => at.mainActivityId === numericMainActivityId);
            
            const mappedTypes = filtered.map(at => ({
              activityTypeId: at.id,
              activityName: at.name_en || at.name_ta || at.name_si || '',
              title: { ta: at.name_ta, en: at.name_en, si: at.name_si },
              description: undefined
            }));
            
            if (mappedTypes.length > 0) {
              this.activityTypeCache.set(numericMainActivityId, mappedTypes);
              this.filteredActivityTypes = [...mappedTypes]; // Create new array reference to trigger change detection
              this.snackBar.open(`Loaded ${mappedTypes.length} activity types (using fallback method)`, 'Close', { duration: 3000 });
            } else {
              this.filteredActivityTypes = [];
              this.activityTypeCache.set(numericMainActivityId, []);
              this.snackBar.open(`No activity types available for this main activity. Please create activity types first.`, 'Close', { duration: 5000 });
            }
          } else {
            this.filteredActivityTypes = [];
            this.activityTypeCache.set(numericMainActivityId, []);
            this.snackBar.open(`Failed to load activity types. Please check backend API endpoint.`, 'Close', { duration: 5000 });
          }
        } catch (fallbackError) {
          this.filteredActivityTypes = [];
          this.activityTypeCache.set(numericMainActivityId, []);
          this.snackBar.open(`Failed to load activity types.`, 'Close', { duration: 5000 });
        }
      }
    }

    if (!this.filteredActivityTypes.length) {
      if (this.activity) {
        this.activity.activityTypeId = 0;
      }
      // Don't show error message - the UI will show the "No activity types available" message
      return;
    }

    // Don't auto-select activity type - let user choose manually
    // Only clear if current selection is invalid
    const currentTypeId = this.activity?.activityTypeId || 0;
    const typeStillValid = currentTypeId > 0 && this.filteredActivityTypes.some(at => at.activityTypeId === currentTypeId);

    if (!typeStillValid) {
      // If exercises exist, we need to keep the current type for display even if it's not in filtered list
      if (this.exercises && this.exercises.length > 0 && currentTypeId > 0) {
        // Fetch and store current activity type for display
        this.loadCurrentActivityTypeForDisplay(currentTypeId);
      } else {
        // Clear invalid selection - don't auto-select
        if (this.activity) {
          this.activity.activityTypeId = 0;
        }
        this.currentActivityTypeForDisplay = null;
      }
    } else {
      // Current type is valid, clear stored type
      this.currentActivityTypeForDisplay = null;
    }
  }

  private async loadCurrentActivityTypeForDisplay(activityTypeId: number): Promise<void> {
    try {
      // Try to get from all activity types
      const allTypes = await this.activityTypeApiService.getAll().toPromise();
      if (allTypes) {
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
      }
    } catch (error) {
      // If fetch fails, keep null
      this.currentActivityTypeForDisplay = null;
    }
  }

  getDisplayActivityTypes(): ActivityType[] {
    // If exercises exist and current type is not in filtered list, include it
    if (this.exercises && this.exercises.length > 0 && this.currentActivityTypeForDisplay) {
      const isInFiltered = this.filteredActivityTypes.some(at => at.activityTypeId === this.currentActivityTypeForDisplay!.activityTypeId);
      if (!isInFiltered) {
        return [...this.filteredActivityTypes, this.currentActivityTypeForDisplay];
      }
    }
    return this.filteredActivityTypes;
  }

  private evaluateMainActivityAvailability(mainActivityId: number): string[] | null {
    // If no main activity is selected, don't mark as "not available"
    if (!mainActivityId || mainActivityId <= 0) {
      this.isMainActivityNotAvailable = false;
      this.selectedMainActivityName = null;
      return null;
    }

    const mainActivity = this.mainActivities.find(ma => ma.id === mainActivityId);
    this.selectedMainActivityName =
      mainActivity?.title?.en ||
      mainActivity?.title?.ta ||
      mainActivity?.title?.si ||
      null;

    // Mark as unavailable only if the main activity itself does not exist.
    // The presence or absence of activity types is determined purely by backend data.
    this.isMainActivityNotAvailable = !mainActivity;

    // No hard‑coded “allowed names” – everything is data‑driven from the API.
    return null;
  }

  handlePreviewExercise(exerciseJsonString: string): void {
    // console.log('Preview exercise updated:', exerciseJsonString);
    if (!this.activity) return;
    
    try {
      // Parse the exercise JSON to validate it
      JSON.parse(exerciseJsonString);
      this.previewContent = { ...this.activity, contentJson: exerciseJsonString };
      this.snackBar.open('Preview updated', 'Close', { duration: 1500 });
    } catch (error) {
      this.snackBar.open('Invalid JSON - preview not updated', 'Close', { duration: 3000 });
    }
  }

  async handleSave(): Promise<void> {
    if (!this.activity) return;
    const isUpdate = this.isEditMode && !!this.activityId;

    // Construct payload with strong coercion and fallbacks
    const coercedLessonId = Number(this.activity.lessonId || this.lessonId || 0);
    const coercedActivityTypeId = Number(this.activity.activityTypeId || 0);
    const coercedMainActivityId = Number(this.activity.mainActivityId || 0);
    
    const enteredTitle = this.activity.title || { ta: '', en: '', si: '' } as MultilingualText;

    // Collect actual JSON from exercises (user's data)
    let contentJsonToSave = '[]';
    if (this.exercises && this.exercises.length > 0) {
      try {
        // Get JSON data from all exercises and combine into an array
        const exercisesJsonArray = this.exercises
          .map(ex => {
            try {
              // Parse to validate, then return as object
              return JSON.parse(ex.jsonData);
            } catch (e) {
              return null;
            }
          })
          .filter(json => json !== null); // Remove invalid JSON entries
        
        // Convert array to JSON string
        contentJsonToSave = JSON.stringify(exercisesJsonArray);
      } catch (error) {
        // Fallback to default template if exercises JSON is invalid
        if (coercedActivityTypeId > 0) {
          try {
            contentJsonToSave = MultilingualActivityTemplates.getTemplate(coercedActivityTypeId);
          } catch (templateError) {
          }
        }
      }
    } else {
      // No exercises, use default template
      if (coercedActivityTypeId > 0) {
        try {
          contentJsonToSave = MultilingualActivityTemplates.getTemplate(coercedActivityTypeId);
        } catch (error) {
        }
      }
    }

    const payload: ActivityCreateDto = {
      // Save exactly what the user typed (trimmed). No template fallback.
      title: {
        ta: (enteredTitle.ta || '').toString().trim(),
        en: (enteredTitle.en || '').toString().trim(),
        si: (enteredTitle.si || '').toString().trim()
      },
      sequenceOrder: Number(this.activity.sequenceOrder || 1),
      contentJson: contentJsonToSave, // Use actual exercises JSON or default template
      lessonId: coercedLessonId,
      activityTypeId: coercedActivityTypeId,
      mainActivityId: coercedMainActivityId
    };

    // Validate required IDs
    if (!coercedLessonId || coercedLessonId <= 0) {
      this.snackBar.open('Please select a valid Lesson.', 'Close', { duration: 5000 });
      return;
    }
    
    if (!coercedActivityTypeId || coercedActivityTypeId <= 0) {
      this.snackBar.open('Please select a valid Activity Type.', 'Close', { duration: 5000 });
      return;
    }
    
    if (!coercedMainActivityId || coercedMainActivityId <= 0) {
      this.snackBar.open('Please select a valid Main Activity.', 'Close', { duration: 5000 });
      return;
    }

    try {
      const hasDraftExercises = this.exercises.some(ex => this.isDraftExercise(ex));
      let createdOrUpdated: MultilingualActivity | undefined;
      if (this.isEditMode && this.activityId) {
        createdOrUpdated = await this.activityApiService.update(parseInt(this.activityId, 10), payload).toPromise();
      } else {
        createdOrUpdated = await this.activityApiService.create(payload).toPromise();
        // Update activityId for new activities so we can save exercises
        if (createdOrUpdated?.activityId) {
          this.activityId = createdOrUpdated.activityId.toString();
          this.isEditMode = true;
        }
      }

      const persistedActivityId = createdOrUpdated?.activityId || (this.activityId ? Number(this.activityId) : undefined);
      if (hasDraftExercises && persistedActivityId) {
        await this.persistDraftExercises(persistedActivityId);
        await this.reloadExercises(persistedActivityId);
      }

      this.snackBar.open('Activity saved successfully!', 'Close', { duration: 3000 });
      // Navigate back and open preview for the saved activity
      const lessonId = payload.lessonId;
      const actId = createdOrUpdated?.activityId || (this.activityId ? Number(this.activityId) : undefined);
      if (lessonId && actId) {
        this.router.navigate(['/activities'], { queryParams: { lessonId, previewId: actId, status: isUpdate ? 'updated' : 'saved' } });
      } else {
        this.goBack();
      }
    } catch (error) {
      this.snackBar.open('An error occurred while saving.', 'Close', { duration: 5000 });
    }
  }

  // Exercise CRUD methods
  async handleAddExercise(): Promise<void> {
    const typeId = Number(this.activity?.activityTypeId || 0);
    let jsonTemplate = '{}';
    
    if (typeId && typeId > 0) {
      try {
        jsonTemplate = MultilingualActivityTemplates.getTemplate(typeId);
      } catch (error) {
      }
    }

    if (!this.activityId) {
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
      // Immediately show preview for the newly added exercise
      this.previewContent = {
        ...(this.activity || {}),
        activityTypeId: this.activity?.activityTypeId || 0,
        contentJson: jsonTemplate
      };
      // If current activity type is not in filtered list, load it for display
      const currentTypeId = this.activity?.activityTypeId || 0;
      if (currentTypeId > 0 && !this.filteredActivityTypes.some(at => at.activityTypeId === currentTypeId)) {
        await this.loadCurrentActivityTypeForDisplay(currentTypeId);
      }
      this.cdr.detectChanges();
      this.snackBar.open('Draft exercise created. It will be saved when you save the activity.', 'Close', { duration: 4000 });
      return;
    }

    const createDto: CreateExerciseDto = {
      activityId: parseInt(this.activityId, 10),
      jsonData: jsonTemplate,
      sequenceOrder: this.exercises.length + 1
    };

      try {
       const newExercise = await this.exerciseApiService.create(createDto).toPromise();
       if (newExercise) {
         this.exercises.push(newExercise);
         this.normalizeExpandedExercise();
         this.expandedExercise = this.exercises.length - 1;
         // Immediately show preview for the newly added exercise
         this.previewContent = {
           ...(this.activity || {}),
           activityTypeId: this.activity?.activityTypeId || 0,
           contentJson: newExercise.jsonData
         };
         // If current activity type is not in filtered list, load it for display
         const currentTypeId = this.activity?.activityTypeId || 0;
         if (currentTypeId > 0 && !this.filteredActivityTypes.some(at => at.activityTypeId === currentTypeId)) {
           await this.loadCurrentActivityTypeForDisplay(currentTypeId);
         }
         this.cdr.detectChanges();
         this.snackBar.open('Exercise added successfully!', 'Close', { duration: 2000 });
       }
      } catch (error) {
        this.snackBar.open('Failed to add exercise.', 'Close', { duration: 5000 });
      }
  }

  async handleUpdateExercise(exerciseId: number, jsonData: string): Promise<void> {
    const index = this.exercises.findIndex(ex => ex.id === exerciseId);
    if (index === -1) {
      return;
    }

    const targetExercise = this.exercises[index];
    if (this.isDraftExercise(targetExercise)) {
      this.exercises[index] = { ...targetExercise, jsonData, updatedAt: new Date().toISOString() };
      this.snackBar.open('Draft exercise updated!', 'Close', { duration: 2000 });
      return;
    }

    try {
      // Validate JSON
      JSON.parse(jsonData);
      
      await this.exerciseApiService.update(exerciseId, { jsonData }).toPromise();
      
      // Update local exercise
      const index = this.exercises.findIndex(ex => ex.id === exerciseId);
      if (index !== -1) {
        this.exercises[index] = { ...this.exercises[index], jsonData };
      }
      
      this.snackBar.open('Exercise updated!', 'Close', { duration: 1500 });
    } catch (error) {
      this.snackBar.open('Failed to update exercise. Check JSON format.', 'Close', { duration: 5000 });
    }
  }

  async handleDeleteExercise(exerciseId: number): Promise<void> {
    const index = this.exercises.findIndex(ex => ex.id === exerciseId);
    if (index === -1) {
      return;
    }

    const exercise = this.exercises[index];
    if (this.isDraftExercise(exercise)) {
      this.exercises = this.exercises.filter(ex => ex.id !== exerciseId);
      this.normalizeExpandedExercise();
      this.resequenceExercises();
      // If no exercises left, clear stored activity type
      if (this.exercises.length === 0) {
        this.currentActivityTypeForDisplay = null;
      }
      this.cdr.detectChanges();
      this.snackBar.open('Draft exercise deleted.', 'Close', { duration: 2000 });
      return;
    }

    const confirmed = confirm('Are you sure you want to delete this exercise?');
    if (!confirmed) return;

    try {
      await this.exerciseApiService.delete(exerciseId).toPromise();
      this.exercises = this.exercises.filter(ex => ex.id !== exerciseId);
      this.resequenceExercises();
      this.normalizeExpandedExercise();
      // If no exercises left, clear stored activity type
      if (this.exercises.length === 0) {
        this.currentActivityTypeForDisplay = null;
      }
      this.cdr.detectChanges();
      this.snackBar.open('Exercise deleted successfully!', 'Close', { duration: 2000 });
    } catch (error) {
      this.snackBar.open('Failed to delete exercise.', 'Close', { duration: 5000 });
    }
  }

  // --- JSON Editor helpers ---
  onJsonChanged(value: string): void {
    // Lightweight live parse to update first-exercise preview safely
    try {
      const parsed = JSON.parse(value || '[]');
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const first = arr[0] || {};
      this.previewContent = this.activity ? { ...this.activity, contentJson: JSON.stringify(first, null, 2) } : null;
    } catch {
      // ignore typing errors; keep previous preview
    }
  }

  formatJson(): void {
    if (!this.activity) return;
    try {
      const parsed = JSON.parse(this.activity.contentJson || '[]');
      const pretty = JSON.stringify(parsed, null, 2);
      this.activity.contentJson = pretty;
      this.snackBar.open('JSON formatted', 'Close', { duration: 1500 });
    } catch (e) {
      this.snackBar.open('Invalid JSON - cannot format', 'Close', { duration: 3000 });
    }
  }

  validateJson(): void {
    if (!this.activity) return;
    try {
      JSON.parse(this.activity.contentJson || '[]');
      this.snackBar.open('JSON is valid', 'Close', { duration: 1500 });
    } catch (e: any) {
      this.snackBar.open(`Invalid JSON: ${e?.message || ''}`.trim(), 'Close', { duration: 4000 });
    }
  }

  applyJsonToPreview(): void {
    if (!this.activity) return;
    try {
      const parsed = JSON.parse(this.activity.contentJson || '[]');
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const first = arr[0] || {};
      this.previewContent = { ...this.activity, contentJson: JSON.stringify(first, null, 2) };
      this.snackBar.open('Preview updated from JSON', 'Close', { duration: 1500 });
    } catch {
      this.snackBar.open('Invalid JSON - preview not updated', 'Close', { duration: 3000 });
    }
  }

  handleExpansionChange(panelIndex: number): void {
    this.expandedExercise = this.expandedExercise === panelIndex ? false : panelIndex;
  }

  handleSetExpanded(index: number): void {
    this.expandedExercise = index;
  }

  async handleCopyTemplate(): Promise<void> {
    try {
      const typeId = this.activity?.activityTypeId || 0;
      if (!typeId || typeId <= 0) {
        this.snackBar.open('Select an Activity Type to copy its template.', 'Close', { duration: 3000 });
        return;
      }
      const templateJson = this.getActivityTemplate(typeId);
      await navigator.clipboard.writeText(templateJson);
      this.snackBar.open('Template JSON copied to clipboard!', 'Close', { duration: 3000 });
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = this.getActivityTemplate(this.activity?.activityTypeId || 0);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.snackBar.open('Template JSON copied to clipboard!', 'Close', { duration: 3000 });
    }
  }

  getActivityTemplate(activityTypeId: number): string {
    if (!activityTypeId || activityTypeId <= 0) {
      return '{}';
    }
    return MultilingualActivityTemplates.getTemplate(activityTypeId);
  }

  goBack(): void {
    const lessonId = this.activity?.lessonId || this.lessonId;
    if (lessonId) {
      this.router.navigate(['activities'], { queryParams: { lessonId } });
    } else {
      // Fallback to levels page if no lesson ID
      this.router.navigate(['levels']);
    }
  }

  // Wrapper methods to handle type conversion
  handleFormChangeWrapper(event: any): void {
    // console.log('Form change wrapper called:', event);
    void this.handleFormChange(event as Partial<MultilingualActivity>);
  }

  handlePreviewExerciseWrapper(event: any): void {
    // console.log('Preview exercise wrapper called:', event);
    this.handlePreviewExercise(event as string);
  }

  handleExpansionChangeWrapper(event: any): void {
    this.handleExpansionChange(event as number);
  }

  handleSetExpandedWrapper(event: any): void {
    this.handleSetExpanded(event as number);
  }

  updateTitleField(code: 'ta' | 'en' | 'si', value: string): void {
    if (!this.activity) return;
    const currentTitle = this.activity.title || { ta: '', en: '', si: '' };
    const updatedTitle = { ...currentTitle, [code]: value };
    this.activity.title = updatedTitle;
    this.handleFormChangeWrapper({ title: updatedTitle });
  }

  updateSequenceOrder(value: number | string): void {
    if (!this.activity) return;
    const numericValue = Number(value) || 0;
    this.activity.sequenceOrder = numericValue;
    this.handleFormChangeWrapper({ sequenceOrder: numericValue });
  }

  updateMainActivityId(value: number | string): void {
    if (!this.activity) return;
    if (this.isStructureSelectionLocked) {
      this.snackBar.open(this.mainActivityLockMessage || 'Cannot change Main Activity right now.', 'Close', { duration: 4000 });
      return;
    }
    const numericValue = Number(value) || 0;
    this.activity.mainActivityId = numericValue;
    this.handleFormChangeWrapper({ mainActivityId: numericValue });
  }

  updateActivityTypeId(value: number | string): void {
    if (!this.activity) return;
    if (this.isStructureSelectionLocked) {
      this.snackBar.open(this.activityTypeLockMessage || 'Cannot change Activity Type right now.', 'Close', { duration: 4000 });
      return;
    }
    const numericValue = Number(value) || 0;
    this.activity.activityTypeId = numericValue;
    this.handleFormChangeWrapper({ activityTypeId: numericValue });
  }

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
    if (drafts.length === 0) {
      return;
    }

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
        this.snackBar.open('Could not save a draft exercise. Please try again later.', 'Close', { duration: 5000 });
      }
    }

    if (replacementMap.size > 0) {
      this.exercises = this.exercises.map(exercise => {
        if (this.isDraftExercise(exercise)) {
          const replacement = replacementMap.get(exercise.id);
          return replacement ? replacement : exercise;
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
    }
  }
}