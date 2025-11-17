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
  
  private routeSubscription?: Subscription;
  private lastActivityTypeId: number | null = null;
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
          if (!this.activity.activityTypeId || this.activity.activityTypeId <= 0) {
            const firstTypeId = this.activityTypes[0]?.activityTypeId;
            if (firstTypeId) {
              this.activity.activityTypeId = firstTypeId;
              this.autoPopulateTemplate(firstTypeId);
            }
          }

          if (!this.activity.mainActivityId || this.activity.mainActivityId <= 0) {
            const firstMainId = this.mainActivities[0]?.id;
            if (firstMainId) {
              this.activity.mainActivityId = firstMainId;
            }
          }
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

  handleFormChange(updatedActivityData: Partial<MultilingualActivity>): void {
    // console.log('Activity form changed:', updatedActivityData);
    const previousTypeId = this.lastActivityTypeId;
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
    
    // Ensure title is properly handled
    if (updatedActivityData.title) {
      mergedData.title = { ...updatedActivityData.title };
    }
    
    this.activity = mergedData;

    // Auto-generate template when activity type changes
    // Only auto-populate if we have a valid activity type ID
    if (nextTypeId && nextTypeId > 0 && previousTypeId !== nextTypeId) {
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
    this.handleFormChange(event as Partial<MultilingualActivity>);
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