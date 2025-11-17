import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

// --- Interfaces ---

type Language = 'ta' | 'en' | 'si';
type ContentType = 'word' | 'letter' | 'image'; 

interface MultiLingualText { [key: string]: string; }

interface Group {
  groupId: string;
  groupName: MultiLingualText;
}

interface Item {
  id: string;
  content: MultiLingualText;
  groupId: string; // The correct group ID
}

interface ActivityContent {
  title: MultiLingualText;
  instruction: MultiLingualText;
  contentType: ContentType;
  groups: Group[];
  items: Item[];
}

// Interface for Game State
interface GameItem extends Item {
  status: 'default' | 'correct' | 'incorrect';
}

// --- Component Definition ---

@Component({
  selector: 'app-group-sorter', 
  imports: [CommonModule, DragDropModule, MatButtonModule, MatIconModule, MatCardModule],
  standalone: true,
  templateUrl: './group-sorter.component.html',
  styleUrls: ['./group-sorter.component.css']
})
export class GroupSorterComponent implements OnInit {
  @Input() content!: ActivityContent;
  @Input() currentLang: Language = 'ta';

  // --- Game State Signals ---
  // Source list (items yet to be placed)
  unassignedItems = signal<GameItem[]>([]); 
  // Map of group ID to the items currently dropped into it
  assignedGroups = signal<Map<string, GameItem[]>>(new Map()); 
  
  isChecking = signal(false);
  isFinished = signal(false);

  // --- Computed Values ---
  groupDefinitions = computed(() => this.content?.groups || []);
  
  isComplete = computed(() => {
    // Game is complete if all items have been moved out of the unassigned list
    return this.unassignedItems().length === 0;
  });

  constructor() {}

  ngOnInit(): void {
    if (this.content && this.content.items.length > 0) {
      this.initializeGame();
    }
  }

  // --- Initialization ---

  initializeGame(): void {
    // 1. Convert source items to GameItems
    const initialItems: GameItem[] = this.shuffle(this.content.items.map(item => ({
      ...item,
      status: 'default'
    })));

    this.unassignedItems.set(initialItems);

    // 2. Initialize the map for assigned groups
    const initialGroupsMap = new Map<string, GameItem[]>();
    this.groupDefinitions().forEach(group => {
      initialGroupsMap.set(group.groupId, []);
    });
    this.assignedGroups.set(initialGroupsMap);
    
    this.isFinished.set(false);
    this.isChecking.set(false);
  }

  private shuffle(array: GameItem[]): GameItem[] {
    let currentIndex = array.length;
    let temporaryValue;
    let randomIndex;

    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }

  // --- Drag and Drop Logic ---

  drop(event: CdkDragDrop<GameItem[]>): void {
    if (this.isFinished()) return;

    if (event.previousContainer === event.container) {
      // Reordering within the same list (e.g., reordering items in a group)
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Transferring between lists (e.g., from unassigned to a group)
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      // Since the item moved, remove any previous feedback
      this.resetFeedback();
    }
  }
  
  // --- Answer Check Logic ---

  checkAnswers(): void {
    if (this.isChecking() || !this.isComplete()) return;

    this.isChecking.set(true);
    let allCorrect = true;

    // Create a new map to apply feedback
    const newAssignedGroups = new Map<string, GameItem[]>();

    this.assignedGroups().forEach((items, groupId) => {
      let groupCorrect = true;

      // Check each item within the group
      const checkedItems = items.map(item => {
        const isCorrect = item.groupId === groupId;
        if (!isCorrect) {
          allCorrect = false;
          groupCorrect = false;
        }
        return {
          ...item,
          status: isCorrect ? 'correct' : 'incorrect'
        } as GameItem;
      });
      
      newAssignedGroups.set(groupId, checkedItems);
    });

    this.assignedGroups.set(newAssignedGroups);
    this.isFinished.set(true);
    this.isChecking.set(false);
  }

  // --- Utility Methods ---

  // Resets feedback statuses on all items
  resetFeedback(): void {
    this.isChecking.set(false);
    this.assignedGroups.update(map => {
        const newMap = new Map(map);
        newMap.forEach((items, key) => {
            newMap.set(key, items.map(item => ({...item, status: 'default'})));
        });
        return newMap;
    });
  }

  // Gets the CDK ID for a group container (Needed for transferArrayItem)
  getConnectedListIds(): string[] {
    // Returns ['unassigned-list', 'group-G1', 'group-G2', ...]
    return [
      'unassigned-list',
      ...this.groupDefinitions().map(g => `group-${g.groupId}`)
    ];
  }

  // Extracts text from MultiLingual object
  text(multiLingual: MultiLingualText | undefined): string {
    if (!multiLingual) return 'N/A';
    return multiLingual[this.currentLang] || multiLingual['en'] || 'N/A';
  }

  // Renders content (Text/Image/Audio Icon)
  renderContent(item: GameItem): string {
    const content = this.text(item.content as MultiLingualText);
    const type = this.content.contentType;

    switch (type) {
        // Since the JSON implies 'word', we use spans. Modify for image/audio.
        case 'image':
            return `<img src="${content}" alt="Item" class="max-h-8 object-contain"/>`;
        case 'word':
        case 'letter':
        default:
            return `<span>${content}</span>`;
    }
  }
}