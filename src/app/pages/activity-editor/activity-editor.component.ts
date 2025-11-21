import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { ActivityFormComponent } from '../../components/activities/activity-form/activity-form.component';
import { DevicePreviewComponent } from '../../components/activities/device-preview/device-preview.component';
import { ExerciseEditorComponent } from '../../components/activities/exercise-editor/exercise-editor.component';
import { MultilingualActivityTemplates } from '../../services/multilingual-activity-templates.service';
import { SidebarLanguageManagerComponent } from '../../components/common/sidebar-language-manager/sidebar-language-manager.component';
import { ActivityApiService, MultilingualActivity } from '../../services/activity-api.service';
import { MainActivityApiService, MainActivityResponse } from '../../services/main-activity-api.service';
import { ActivityTypeApiService, ActivityTypeResponse } from '../../services/activity-type-api.service';
import { ExerciseApiService, Exercise, CreateExerciseDto } from '../../services/exercise-api.service';
import { Activity } from '../../types/activity.types';
import { MainActivity } from '../../types/main-activity.types';
import { ActivityType } from '../../types/activity-type.types';
import { MultilingualText } from '../../types/multilingual.types';
import { Subscription } from 'rxjs';

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

const normalizeString = (value?: string | null): string => {
  if (!value) return '';
  // Trim, convert to lowercase, and remove extra spaces
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
    ActivityFormComponent,
    DevicePreviewComponent,
    ExerciseEditorComponent,
    SidebarLanguageManagerComponent,
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
  expandedExercise: number | false = 0;
  
  mainActivities: MainActivity[] = [];
  activityTypes: ActivityType[] = [];
  filteredActivityTypes: ActivityType[] = [];
  selectedMainActivityName: string | null = null;
  isMainActivityNotAvailable = false;
  
  private routeSubscription?: Subscription;
  private lastActivityTypeId: number | null = null;
  private readonly activityTypeCache = new Map<number, ActivityType[]>();
  private tempExerciseIdCounter = -1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activityApiService: ActivityApiService,
    private mainActivityApiService: MainActivityApiService,
    private activityTypeApiService: ActivityTypeApiService,
    private exerciseApiService: ExerciseApiService,
    private snackBar: MatSnackBar
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

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  private async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      const mainActivitiesPromise = this.mainActivityApiService.getAll().toPromise();
      const activityTypesPromise = this.activityTypeApiService.getAll().toPromise();
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

      const [mainActs, actTypes, loadedActivity] = await Promise.all([
        mainActivitiesPromise,
        activityTypesPromise,
        activityPromise
      ]);

      this.mainActivities = (mainActs || []).map(ma => ({
        id: ma.id,
        name: ma.name_en || ma.name_ta || ma.name_si || '',
        title: { ta: ma.name_ta, en: ma.name_en, si: ma.name_si },
        description: undefined
      }));
      this.activityTypes = (actTypes || []).map(at => ({
        activityTypeId: at.id,
        activityName: at.name_en || at.name_ta || at.name_si || '',
        title: { ta: at.name_ta, en: at.name_en, si: at.name_si },
        description: undefined
      }));
      // Don't set filteredActivityTypes here - it will be set after filtering based on main activity
      this.filteredActivityTypes = [];

      // Load exercises from Exercise API if editing an existing activity
      if (this.isEditMode && this.activityId) {
        const exercisesData = await this.exerciseApiService.getByActivityId(parseInt(this.activityId, 10)).toPromise();
        this.exercises = exercisesData || [];
      } else {
        // For new activities, start with an empty exercises array
        this.exercises = [];
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

        // Apply sensible defaults when creating new activity
        if (!this.isEditMode) {
          if (!this.activity.mainActivityId || this.activity.mainActivityId <= 0) {
            const firstMainId = this.mainActivities[0]?.id;
            if (firstMainId) {
              this.activity.mainActivityId = firstMainId;
            }
          }
        }

        if (this.activity) {
          const mainActivityId = this.activity.mainActivityId || 0;
          console.log('Initial load - applying filter for main activity:', mainActivityId);
          const allowedNames = this.evaluateMainActivityAvailability(mainActivityId);
          if (this.isMainActivityNotAvailable) {
            console.log('Main activity is not available, clearing filtered types');
            this.filteredActivityTypes = [];
            this.activity.activityTypeId = 0;
          } else {
            await this.applyActivityTypeFilter(mainActivityId, allowedNames);
            console.log('After initial filter, filtered types count:', this.filteredActivityTypes.length);
            console.log('Filtered types:', this.filteredActivityTypes.map(t => t.activityName));
            
            // Check if current activity type is valid for the main activity
            const currentTypeId = this.activity.activityTypeId || 0;
            const isValid = currentTypeId > 0 && this.filteredActivityTypes.some(at => at.activityTypeId === currentTypeId);
            
            if (!isValid) {
              // Current activity type is not valid, set default from filtered list
              console.log('Current activity type is not valid for main activity, setting default');
              const firstFilteredType = this.filteredActivityTypes[0];
              if (firstFilteredType) {
                console.log(`Setting default activity type to: ${firstFilteredType.activityName} (ID: ${firstFilteredType.activityTypeId})`);
                this.activity.activityTypeId = firstFilteredType.activityTypeId;
                if (!this.isEditMode) {
                  this.autoPopulateTemplate(firstFilteredType.activityTypeId);
                }
              } else {
                this.activity.activityTypeId = 0;
              }
            } else if (!this.isEditMode && (!this.activity.activityTypeId || this.activity.activityTypeId <= 0)) {
              // New activity, set default if none selected
              const firstFilteredType = this.filteredActivityTypes[0];
              if (firstFilteredType) {
                console.log(`Setting default activity type for new activity: ${firstFilteredType.activityName} (ID: ${firstFilteredType.activityTypeId})`);
                this.activity.activityTypeId = firstFilteredType.activityTypeId;
                this.autoPopulateTemplate(firstFilteredType.activityTypeId);
              }
            }
          }
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
        
        if (!this.activity.mainActivityId || this.activity.mainActivityId <= 0) {
          const firstMainId = this.mainActivities[0]?.id || 0;
          if (firstMainId > 0) {
            this.activity.mainActivityId = firstMainId;
          }
        }
        
        // Check if default main activity is Videos or Conversations
        const defaultMainActivityId = this.activity.mainActivityId || 0;
        console.log('New activity - applying filter for default main activity:', defaultMainActivityId);
        const allowedNames = this.evaluateMainActivityAvailability(defaultMainActivityId);
        
        if (this.isMainActivityNotAvailable) {
          console.log('Default main activity is not available, clearing filtered types');
          this.filteredActivityTypes = [];
          this.activity.activityTypeId = 0;
        } else if (defaultMainActivityId > 0) {
          await this.applyActivityTypeFilter(defaultMainActivityId, allowedNames);
          console.log('After default filter, filtered types count:', this.filteredActivityTypes.length);
          // Set default activity type for new activity
          if (this.filteredActivityTypes.length > 0 && (!this.activity.activityTypeId || this.activity.activityTypeId === 0)) {
            const firstFilteredType = this.filteredActivityTypes[0];
            if (firstFilteredType) {
              console.log(`Setting default activity type for new activity: ${firstFilteredType.activityName} (ID: ${firstFilteredType.activityTypeId})`);
              this.activity.activityTypeId = firstFilteredType.activityTypeId;
              this.autoPopulateTemplate(firstFilteredType.activityTypeId);
            }
          }
        } else {
          // No main activity selected yet, show empty list
          console.log('No main activity selected yet, showing empty list');
          this.filteredActivityTypes = [];
        }
      }
      
      // console.log('Loaded data:', { mainActivities: this.mainActivities, activityTypes: this.activityTypes, activity: this.activity });
    } catch (error) {
      console.error("Failed to load data", error);
      this.snackBar.open('Failed to load data', 'Close', { duration: 5000 });
    } finally {
      this.isLoading = false;
    }
  }

  async handleFormChange(updatedActivityData: Partial<MultilingualActivity>): Promise<void> {
    console.log('Activity form changed:', updatedActivityData);
    const previousTypeId = this.lastActivityTypeId;
    const previousMainActivityId = this.activity?.mainActivityId || 0;
    const nextTypeId = Number(updatedActivityData.activityTypeId || (this.activity?.activityTypeId || 0));

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
    const hasMainActivityChange = (mergedData.mainActivityId || 0) !== previousMainActivityId;
    
    console.log('Main activity change detected:', {
      previous: previousMainActivityId,
      current: mergedData.mainActivityId,
      hasChange: hasMainActivityChange
    });
    
    let allowedNames: string[] | null = null;
    if (hasMainActivityChange) {
      allowedNames = this.evaluateMainActivityAvailability(mergedData.mainActivityId || 0);
      console.log('Evaluated main activity availability:', {
        mainActivityId: mergedData.mainActivityId,
        isNotAvailable: this.isMainActivityNotAvailable,
        allowedNames
      });
    }
    
    // Ensure title is properly handled
    if (updatedActivityData.title) {
      mergedData.title = { ...updatedActivityData.title };
    }
    
    this.activity = mergedData;

    if (hasMainActivityChange && mergedData.mainActivityId) {
      console.log('Applying activity type filter for main activity:', mergedData.mainActivityId);
      
      // First, evaluate if this main activity is available
      const currentAllowedNames = this.evaluateMainActivityAvailability(mergedData.mainActivityId);
      
      if (this.isMainActivityNotAvailable) {
        console.log('Main activity is not available (Videos/Conversations), clearing filtered types');
        this.filteredActivityTypes = [];
        this.activity.activityTypeId = 0;
        // Clear the preview as well
        if (this.previewContent) {
          this.previewContent.contentJson = '{}';
        }
      } else {
        // Immediately apply filter when main activity changes
        await this.applyActivityTypeFilter(mergedData.mainActivityId, currentAllowedNames);
        console.log('Filter applied, filtered types count:', this.filteredActivityTypes.length);
        console.log('Filtered types:', this.filteredActivityTypes.map(t => t.activityName));
        
        // ALWAYS reset activity type when main activity changes
        // Check if current activity type is valid for the new main activity
        const currentTypeId = this.activity.activityTypeId || 0;
        const isValid = currentTypeId > 0 && this.filteredActivityTypes.some(at => at.activityTypeId === currentTypeId);
        
        if (!isValid) {
          // Current activity type is not valid for new main activity
          console.log('Current activity type is not valid for new main activity, setting default');
          // Set the first filtered activity type as default
          const firstFilteredType = this.filteredActivityTypes[0];
          if (firstFilteredType) {
            console.log(`Setting default activity type to: ${firstFilteredType.activityName} (ID: ${firstFilteredType.activityTypeId})`);
            this.activity.activityTypeId = firstFilteredType.activityTypeId;
            this.autoPopulateTemplate(firstFilteredType.activityTypeId);
          } else {
            // No filtered types available
            console.log('No filtered activity types available, clearing activity type');
            this.activity.activityTypeId = 0;
            if (this.previewContent) {
              this.previewContent.contentJson = '{}';
            }
          }
        } else {
          // Current activity type is valid, keep it but refresh template if needed
          console.log(`Current activity type ${currentTypeId} is valid for new main activity, keeping it`);
        }
      }
    }

    // Auto-generate template when activity type changes
    // Only auto-populate if we have a valid activity type ID
    if (nextTypeId && nextTypeId > 0 && previousTypeId !== nextTypeId && !this.isMainActivityNotAvailable) {
      // console.log('Activity type changed, auto-populating template:', nextTypeId);
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
      const activityType = this.activityTypes.find(at => at.activityTypeId === activityTypeId);
      const activityTypeName = activityType ? activityType.activityName : 'selected';
      this.snackBar.open(`Activity template for ${activityTypeName} loaded. Use "Add Exercise" to create exercises.`, 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Failed to auto-populate template:', error);
      this.snackBar.open('Failed to load template.', 'Close', { duration: 3000 });
    }
  }

  private async applyActivityTypeFilter(mainActivityId: number, allowedNames?: string[] | null): Promise<void> {
    console.log('applyActivityTypeFilter called:', {
      mainActivityId,
      allowedNames,
      activityTypesCount: this.activityTypes.length,
      activityTypes: this.activityTypes.map(t => t.activityName)
    });
    
    if (!this.activityTypes.length) {
      console.warn('No activity types loaded yet, cannot filter');
      this.filteredActivityTypes = [];
      return;
    }

    if (!mainActivityId || mainActivityId <= 0) {
      console.log('No main activity ID provided, using fallback');
      this.filteredActivityTypes = this.filterTypesByAllowedNames(allowedNames ?? null);
      return;
    }

    let usedCache = false;
    if (this.activityTypeCache.has(mainActivityId)) {
      usedCache = true;
      this.filteredActivityTypes = this.activityTypeCache.get(mainActivityId)!;
    } else {
      try {
        console.log(`Fetching activity types for main activity ${mainActivityId}...`);
        const filteredDtos = await this.activityTypeApiService.getByMainActivity(mainActivityId).toPromise();
        console.log(`Backend returned ${filteredDtos?.length || 0} activity types for main activity ${mainActivityId}`);
        
        const mappedTypes = (filteredDtos || []).map(at => ({
          activityTypeId: at.id,
          activityName: at.name_en || at.name_ta || at.name_si || '',
          title: { ta: at.name_ta, en: at.name_en, si: at.name_si },
          description: undefined
        }));

        // Always use backend results if available, otherwise use fallback
        if (mappedTypes.length > 0) {
          console.log(`Using ${mappedTypes.length} activity types from backend:`, mappedTypes.map(t => t.activityName));
          this.activityTypeCache.set(mainActivityId, mappedTypes);
          this.filteredActivityTypes = mappedTypes;
        } else {
          // Backend returned empty, ALWAYS use fallback mapping
          console.log(`Backend returned empty, using fallback mapping for main activity ${mainActivityId}`);
          const fallbackAllowedNames = allowedNames ?? this.getAllowedNamesSnapshot(mainActivityId);
          console.log(`Fallback allowed names:`, fallbackAllowedNames);
          console.log(`Available activity types (${this.activityTypes.length}):`, this.activityTypes.map(t => t.activityName));
          
          // Always try fallback, even if allowedNames is null
          const fallback = this.filterTypesByAllowedNames(fallbackAllowedNames);
          if (fallback.length > 0) {
            this.filteredActivityTypes = fallback;
            this.activityTypeCache.set(mainActivityId, fallback);
            console.log(`✓ Using fallback mapping for main activity ${mainActivityId}, found ${fallback.length} activity types:`, fallback.map(t => t.activityName));
          } else {
            // If fallback returned empty, check if it's because of name mismatch
            console.warn(`✗ Fallback returned empty for main activity ${mainActivityId}`);
            console.warn(`  Allowed names:`, fallbackAllowedNames);
            console.warn(`  Available types:`, this.activityTypes.map(t => ({ name: t.activityName, normalized: normalizeString(t.activityName) })));
            
            // Try a more flexible matching approach
            if (fallbackAllowedNames && fallbackAllowedNames.length > 0) {
              const flexibleMatch = this.filterTypesByFlexibleMatching(fallbackAllowedNames);
              if (flexibleMatch.length > 0) {
                console.log(`✓ Using flexible matching, found ${flexibleMatch.length} activity types:`, flexibleMatch.map(t => t.activityName));
                this.filteredActivityTypes = flexibleMatch;
                this.activityTypeCache.set(mainActivityId, flexibleMatch);
              } else {
                this.filteredActivityTypes = [];
                this.activityTypeCache.set(mainActivityId, []);
              }
            } else {
              this.filteredActivityTypes = [];
              this.activityTypeCache.set(mainActivityId, []);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load filtered activity types from backend, using fallback:', error);
        const fallbackAllowedNames = allowedNames ?? this.getAllowedNamesSnapshot(mainActivityId);
        const fallback = this.filterTypesByAllowedNames(fallbackAllowedNames);
        this.filteredActivityTypes = fallback;
        if (fallback.length > 0) {
          this.activityTypeCache.set(mainActivityId, fallback);
          console.log(`Using fallback mapping after error, found ${fallback.length} activity types`);
        } else {
          this.activityTypeCache.set(mainActivityId, []);
        }
      }
    }

    if (!this.filteredActivityTypes.length) {
      if (this.activity) {
        this.activity.activityTypeId = 0;
      }
      // Only show error if it's not Videos/Conversations and we actually tried to filter
      if (!usedCache && !this.isMainActivityNotAvailable && mainActivityId > 0) {
        console.warn(`No activity types found for main activity ${mainActivityId}. Allowed names:`, allowedNames);
        // Don't show error message - the UI will show the "No activity types available" message
      }
      return;
    }

    // Set default activity type if current one is invalid or not set
    // But only if we're not in the middle of a main activity change (to avoid conflicts)
    const currentTypeId = this.activity?.activityTypeId || 0;
    const typeStillValid = currentTypeId > 0 && this.filteredActivityTypes.some(at => at.activityTypeId === currentTypeId);

    if (!typeStillValid && this.filteredActivityTypes.length > 0) {
      // Set the first filtered activity type as default
      const firstFilteredType = this.filteredActivityTypes[0];
      if (this.activity && firstFilteredType) {
        console.log(`Setting default activity type to: ${firstFilteredType.activityName} (ID: ${firstFilteredType.activityTypeId})`);
        this.activity.activityTypeId = firstFilteredType.activityTypeId;
        // Only auto-populate template if the type actually changed
        if (currentTypeId !== firstFilteredType.activityTypeId) {
          this.autoPopulateTemplate(firstFilteredType.activityTypeId);
        }
      }
    } else if (!typeStillValid && this.filteredActivityTypes.length === 0) {
      // No filtered types available, clear activity type
      if (this.activity) {
        this.activity.activityTypeId = 0;
      }
    }
  }

  private getMainActivityKey(mainActivityId: number): string | null {
    const mainActivity = this.mainActivities.find(ma => ma.id === mainActivityId);
    if (!mainActivity) {
      console.warn(`Main activity with ID ${mainActivityId} not found`);
      return null;
    }
    // Try multiple ways to get the name
    const raw =
      (mainActivity as any).name ||
      (mainActivity as any).name_en ||
      mainActivity.title?.en ||
      mainActivity.title?.ta ||
      mainActivity.title?.si ||
      '';
    const normalized = normalizeString(raw);
    
    // Check if normalized key exists in mapping
    if (normalized && MAIN_ACTIVITY_ALLOWED_TYPES[normalized]) {
      console.log(`Main activity key for ID ${mainActivityId}:`, { 
        raw, 
        normalized, 
        found: true
      });
      return normalized;
    }
    
    // Try to find a matching key by checking all available keys
    const availableKeys = Object.keys(MAIN_ACTIVITY_ALLOWED_TYPES);
    for (const key of availableKeys) {
      const normalizedKey = normalizeString(key);
      if (normalized === normalizedKey) {
        console.log(`Main activity key for ID ${mainActivityId} (matched):`, { 
          raw, 
          normalized, 
          matchedKey: key
        });
        return normalizedKey;
      }
    }
    
    console.warn(`Main activity key for ID ${mainActivityId} not found in mapping:`, { 
      raw, 
      normalized, 
      mainActivityName: (mainActivity as any).name,
      titleEn: mainActivity.title?.en,
      availableKeys: availableKeys
    });
    return normalized || null;
  }

  private getAllowedNamesSnapshot(mainActivityId: number): string[] | null {
    const key = this.getMainActivityKey(mainActivityId);
    if (!key) {
      console.warn(`Could not get key for main activity ${mainActivityId}`);
      return null;
    }
    const allowedNames = MAIN_ACTIVITY_ALLOWED_TYPES[key] ?? null;
    console.log(`Allowed names for main activity ${mainActivityId} (key: ${key}):`, allowedNames);
    return allowedNames;
  }

  private evaluateMainActivityAvailability(mainActivityId: number): string[] | null {
    const allowedNames = this.getAllowedNamesSnapshot(mainActivityId);
    this.selectedMainActivityName = this.getMainActivityKey(mainActivityId);
    
    // Check if this is Videos or Conversations (empty array means not available)
    if (allowedNames !== null && allowedNames.length === 0) {
      console.log(`Main activity ${mainActivityId} is not available (Videos/Conversations)`);
      this.isMainActivityNotAvailable = true;
    } else if (allowedNames === null) {
      // No mapping found, treat as not available
      console.log(`No mapping found for main activity ${mainActivityId}`);
      this.isMainActivityNotAvailable = true;
    } else {
      this.isMainActivityNotAvailable = false;
    }
    
    console.log(`Main activity availability:`, {
      mainActivityId,
      allowedNames,
      isNotAvailable: this.isMainActivityNotAvailable
    });
    
    return allowedNames;
  }

  private filterTypesByAllowedNames(allowedNames: string[] | null): ActivityType[] {
    if (!allowedNames) {
      return [...this.activityTypes];
    }
    if (!allowedNames.length) {
      return [];
    }
    const allowedSet = new Set(allowedNames.map(name => normalizeString(name)));
    
    // Filter activity types by exact name match (case-insensitive)
    // Maintain the order from allowedNames array
    const filtered: ActivityType[] = [];
    const matchedIds = new Set<number>();
    
    // First, add types in the order specified in allowedNames
    for (const allowedName of allowedNames) {
      const normalizedAllowed = normalizeString(allowedName);
      const matchedType = this.activityTypes.find(type => {
        const typeName = normalizeString(type.activityName);
        return typeName === normalizedAllowed && !matchedIds.has(type.activityTypeId);
      });
      if (matchedType) {
        filtered.push(matchedType);
        matchedIds.add(matchedType.activityTypeId);
      }
    }
    
    // Then add any remaining types that match but weren't in the ordered list
    for (const type of this.activityTypes) {
      if (!matchedIds.has(type.activityTypeId)) {
        const typeName = normalizeString(type.activityName);
        if (allowedSet.has(typeName)) {
          filtered.push(type);
          matchedIds.add(type.activityTypeId);
        }
      }
    }
    
    console.log(`Filtering activity types:`, {
      allowedNames,
      totalTypes: this.activityTypes.length,
      filteredCount: filtered.length,
      filteredNames: filtered.map(t => t.activityName),
      allTypeNames: this.activityTypes.map(t => normalizeString(t.activityName))
    });
    
    return filtered;
  }

  private filterTypesByFlexibleMatching(allowedNames: string[]): ActivityType[] {
    if (!allowedNames || !allowedNames.length) {
      return [];
    }
    
    // Create normalized sets for flexible matching
    const allowedNormalized = allowedNames.map(name => normalizeString(name));
    
    const filtered = this.activityTypes.filter(type => {
      const typeName = normalizeString(type.activityName);
      
      // Try exact match first
      if (allowedNormalized.includes(typeName)) {
        return true;
      }
      
      // Try partial matching - check if any allowed name is contained in type name or vice versa
      for (const allowedName of allowedNormalized) {
        // Remove common words for better matching
        const cleanAllowed = allowedName.replace(/\b(activity|player)\b/gi, '').trim();
        const cleanType = typeName.replace(/\b(activity|player)\b/gi, '').trim();
        
        if (cleanAllowed && cleanType) {
          if (cleanType.includes(cleanAllowed) || cleanAllowed.includes(cleanType)) {
            return true;
          }
        }
        
        // Also try word-by-word matching
        const allowedWords = cleanAllowed.split(/\s+/).filter(w => w.length > 2);
        const typeWords = cleanType.split(/\s+/).filter(w => w.length > 2);
        
        if (allowedWords.length > 0 && typeWords.length > 0) {
          const matchingWords = allowedWords.filter(aw => 
            typeWords.some(tw => tw.includes(aw) || aw.includes(tw))
          );
          if (matchingWords.length >= Math.min(2, allowedWords.length)) {
            return true;
          }
        }
      }
      
      return false;
    });
    
    console.log(`Flexible matching results:`, {
      allowedNames,
      filteredCount: filtered.length,
      filteredNames: filtered.map(t => t.activityName)
    });
    
    return filtered;
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
              console.error('Invalid JSON in exercise:', ex.id, e);
              return null;
            }
          })
          .filter(json => json !== null); // Remove invalid JSON entries
        
        // Convert array to JSON string
        contentJsonToSave = JSON.stringify(exercisesJsonArray);
      } catch (error) {
        console.error('Failed to combine exercises JSON:', error);
        // Fallback to default template if exercises JSON is invalid
        if (coercedActivityTypeId > 0) {
          try {
            contentJsonToSave = MultilingualActivityTemplates.getTemplate(coercedActivityTypeId);
          } catch (templateError) {
            console.error('Failed to get template:', templateError);
          }
        }
      }
    } else {
      // No exercises, use default template
      if (coercedActivityTypeId > 0) {
        try {
          contentJsonToSave = MultilingualActivityTemplates.getTemplate(coercedActivityTypeId);
        } catch (error) {
          console.error('Failed to get template for activity type:', error);
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
        this.router.navigate(['/activities'], { queryParams: { lessonId, previewId: actId } });
      } else {
        this.goBack();
      }
    } catch (error) {
      console.error("Failed to save activity", error);
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
        console.error('Failed to get template:', error);
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
      this.expandedExercise = this.exercises.length - 1;
      this.snackBar.open('புதிய உடற்பயிற்சி வரைவு உருவாக்கப்பட்டது. செயல்பாட்டைச் சேமிக்கும்போது இது சேமிக்கப்படும்.', 'Close', { duration: 4000 });
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
        this.expandedExercise = this.exercises.length - 1;
        this.snackBar.open('Exercise added successfully!', 'Close', { duration: 2000 });
      }
    } catch (error) {
      console.error('Failed to create exercise:', error);
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
      this.snackBar.open('வரைவு உடற்பயிற்சி புதுப்பிக்கப்பட்டது!', 'Close', { duration: 2000 });
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
      console.error('Failed to update exercise:', error);
      this.snackBar.open('Failed to update exercise. Check JSON format.', 'Close', { duration: 5000 });
    }
  }

  async handleDeleteExercise(exerciseId: number): Promise<void> {
    if (this.exercises.length <= 1) {
      this.snackBar.open('An activity must have at least one exercise.', 'Close', { duration: 3000 });
      return;
    }

    const index = this.exercises.findIndex(ex => ex.id === exerciseId);
    if (index === -1) {
      return;
    }

    const exercise = this.exercises[index];
    if (this.isDraftExercise(exercise)) {
      this.exercises = this.exercises.filter(ex => ex.id !== exerciseId);
      this.resequenceExercises();
      this.snackBar.open('வரைவு உடற்பயிற்சி நீக்கப்பட்டது.', 'Close', { duration: 2000 });
      return;
    }

    const confirmed = confirm('Are you sure you want to delete this exercise?');
    if (!confirmed) return;

    try {
      await this.exerciseApiService.delete(exerciseId).toPromise();
      this.exercises = this.exercises.filter(ex => ex.id !== exerciseId);
      this.resequenceExercises();
      this.snackBar.open('Exercise deleted successfully!', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Failed to delete exercise:', error);
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
      console.error('Failed to copy template:', error);
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

  private isDraftExercise(exercise: Exercise): exercise is Exercise & { isDraft?: boolean } {
    return (exercise as any).isDraft === true || exercise.id < 0 || !exercise.activityId;
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
        console.error('Failed to persist draft exercise:', error);
        this.snackBar.open('ஒரு வரைவு உடற்பயிற்சியைச் சேமிக்க முடியவில்லை. பின்னர் முயற்சிக்கவும்.', 'Close', { duration: 5000 });
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
      }
    } catch (error) {
      console.error('Failed to reload exercises after saving drafts:', error);
    }
  }
}