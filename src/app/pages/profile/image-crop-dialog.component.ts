import { Component, Inject, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-image-crop-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="crop-dialog-container">
      <div class="crop-dialog-header">
        <h3>Crop Image</h3>
        <button type="button" class="close-btn" (click)="close()">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="crop-dialog-body">
        <div class="crop-wrapper">
          <div class="crop-container" #cropContainer>
            <img #imageElement [src]="imageSrc" class="crop-image" (load)="onImageLoad()" />
            <div class="crop-overlay" *ngIf="imageLoaded"></div>
            <div class="crop-box" 
                 [style.left.px]="cropX" 
                 [style.top.px]="cropY"
                 [style.width.px]="cropSize" 
                 [style.height.px]="cropSize"
                 (mousedown)="startDrag($event)"
                 *ngIf="imageLoaded">
              <div class="crop-handle crop-handle-nw" (mousedown)="startResize($event, 'nw')"></div>
              <div class="crop-handle crop-handle-ne" (mousedown)="startResize($event, 'ne')"></div>
              <div class="crop-handle crop-handle-sw" (mousedown)="startResize($event, 'sw')"></div>
              <div class="crop-handle crop-handle-se" (mousedown)="startResize($event, 'se')"></div>
            </div>
          </div>
        </div>
        
        <div class="crop-controls">
          <label class="control-label">Crop Size:</label>
          <input type="range" min="100" [max]="maxCropSize" [(ngModel)]="cropSize" (input)="adjustCropBox()" class="slider" />
          <span class="size-value">{{ cropSize }}px</span>
        </div>
        
        <div class="crop-actions">
          <button type="button" class="btn btn-secondary" (click)="close()">Cancel</button>
          <button type="button" class="btn btn-primary" (click)="applyCrop()" [disabled]="!imageLoaded">Save</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .crop-dialog-container {
      width: 90vw;
      max-width: 600px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
    }
    
    .crop-dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .crop-dialog-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
    }
    
    .close-btn svg {
      width: 24px;
      height: 24px;
    }
    
    .crop-dialog-body {
      padding: 20px;
    }
    
    .crop-wrapper {
      width: 100%;
      margin-bottom: 20px;
    }
    
    .crop-container {
      position: relative;
      width: 100%;
      max-height: 400px;
      overflow: auto;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: #f9fafb;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
    }
    
    .crop-image {
      max-width: 100%;
      max-height: 400px;
      display: block;
      user-select: none;
    }
    
    .crop-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      pointer-events: none;
      z-index: 1;
    }
    
    .crop-box {
      position: absolute;
      border: 3px solid #3b82f6;
      background: transparent;
      cursor: move;
      box-sizing: border-box;
      border-radius: 50%;
      z-index: 2;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
    }
    
    .crop-handle {
      position: absolute;
      width: 12px;
      height: 12px;
      background: #3b82f6;
      border: 2px solid white;
      border-radius: 50%;
      cursor: pointer;
    }
    
    .crop-handle-nw {
      top: -6px;
      left: -6px;
      cursor: nw-resize;
    }
    
    .crop-handle-ne {
      top: -6px;
      right: -6px;
      cursor: ne-resize;
    }
    
    .crop-handle-sw {
      bottom: -6px;
      left: -6px;
      cursor: sw-resize;
    }
    
    .crop-handle-se {
      bottom: -6px;
      right: -6px;
      cursor: se-resize;
    }
    
    .crop-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
    }
    
    .control-label {
      font-weight: 500;
      color: #374151;
    }
    
    .slider {
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background: #e5e7eb;
      outline: none;
      -webkit-appearance: none;
    }
    
    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
    }
    
    .slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      border: none;
    }
    
    .size-value {
      font-weight: 600;
      color: #3b82f6;
      min-width: 60px;
      text-align: right;
    }
    
    .crop-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    
    .btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: #3b82f6;
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }
    
    .btn-primary:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }
    
    .btn-secondary:hover {
      background: #d1d5db;
    }
  `]
})
export class ImageCropDialogComponent implements AfterViewInit {
  @ViewChild('imageElement', { static: false }) imageElement!: ElementRef<HTMLImageElement>;
  @ViewChild('cropContainer', { static: false }) cropContainer!: ElementRef<HTMLDivElement>;
  
  imageSrc = '';
  imageLoaded = false;
  cropX = 50;
  cropY = 50;
  cropSize = 200;
  maxCropSize = 300;
  imageWidth = 0;
  imageHeight = 0;
  containerOffsetX = 0;
  containerOffsetY = 0;
  
  isDragging = false;
  isResizing = false;
  dragStartX = 0;
  dragStartY = 0;
  resizeType = '';

  constructor(
    public dialogRef: MatDialogRef<ImageCropDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { imageFile: File },
    private snackBar: MatSnackBar
  ) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imageSrc = e.target.result;
    };
    reader.readAsDataURL(this.data.imageFile);
  }

  ngAfterViewInit() {
    // Add global mouse event listeners
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  onImageLoad() {
    if (this.imageElement) {
      const img = this.imageElement.nativeElement;
      this.imageWidth = img.naturalWidth;
      this.imageHeight = img.naturalHeight;
      this.maxCropSize = Math.min(img.width, img.height) - 20;
      this.cropSize = Math.min(200, this.maxCropSize);
      
      // Center the crop box
      this.cropX = (img.width - this.cropSize) / 2;
      this.cropY = (img.height - this.cropSize) / 2;
      
      this.imageLoaded = true;
      this.updateContainerOffset();
    }
  }

  updateContainerOffset() {
    if (this.cropContainer) {
      const rect = this.cropContainer.nativeElement.getBoundingClientRect();
      this.containerOffsetX = rect.left;
      this.containerOffsetY = rect.top;
    }
  }

  startDrag(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.updateContainerOffset();
    this.dragStartX = event.clientX - this.containerOffsetX - this.cropX;
    this.dragStartY = event.clientY - this.containerOffsetY - this.cropY;
  }

  startResize(event: MouseEvent, type: string) {
    event.preventDefault();
    event.stopPropagation();
    this.isResizing = true;
    this.resizeType = type;
    this.updateContainerOffset();
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
  }

  onMouseMove(event: MouseEvent) {
    if (!this.imageLoaded) return;
    
    if (this.isDragging) {
      const newX = event.clientX - this.containerOffsetX - this.dragStartX;
      const newY = event.clientY - this.containerOffsetY - this.dragStartY;
      
      if (this.imageElement) {
        const img = this.imageElement.nativeElement;
        const maxX = img.width - this.cropSize;
        const maxY = img.height - this.cropSize;
        
        this.cropX = Math.max(0, Math.min(newX, maxX));
        this.cropY = Math.max(0, Math.min(newY, maxY));
      }
    } else if (this.isResizing) {
      const deltaX = event.clientX - this.dragStartX;
      const deltaY = event.clientY - this.dragStartY;
      const delta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
      
      let newSize = this.cropSize;
      if (this.resizeType.includes('e') || this.resizeType.includes('w')) {
        newSize = this.cropSize + (deltaX > 0 ? delta : -delta);
      } else {
        newSize = this.cropSize + (deltaY > 0 ? delta : -delta);
      }
      
      if (this.imageElement) {
        const img = this.imageElement.nativeElement;
        const maxSize = Math.min(img.width - this.cropX, img.height - this.cropY);
        this.cropSize = Math.max(100, Math.min(newSize, maxSize, this.maxCropSize));
      }
      
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;
    }
  }

  onMouseUp() {
    this.isDragging = false;
    this.isResizing = false;
  }

  adjustCropBox() {
    if (this.imageElement) {
      const img = this.imageElement.nativeElement;
      const maxX = img.width - this.cropSize;
      const maxY = img.height - this.cropSize;
      
      this.cropX = Math.max(0, Math.min(this.cropX, maxX));
      this.cropY = Math.max(0, Math.min(this.cropY, maxY));
    }
  }

  applyCrop() {
    if (!this.imageLoaded || !this.imageElement) {
      this.snackBar.open('Please wait for image to load', 'Close', { duration: 3000 });
      return;
    }

    const img = this.imageElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = this.cropSize;
    canvas.height = this.cropSize;
    const ctx = canvas.getContext('2d')!;
    
    // Calculate source coordinates (accounting for image scaling)
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const sourceX = this.cropX * scaleX;
    const sourceY = this.cropY * scaleY;
    const sourceSize = this.cropSize * scaleX;
    
    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(this.cropSize / 2, this.cropSize / 2, this.cropSize / 2, 0, 2 * Math.PI);
    ctx.clip();
    
    // Draw cropped image (circular)
    ctx.drawImage(
      img,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, this.cropSize, this.cropSize
    );
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], this.data.imageFile.name, { 
          type: this.data.imageFile.type || 'image/png' 
        });
        this.dialogRef.close(croppedFile);
      }
    }, this.data.imageFile.type || 'image/png', 0.95);
  }

  close() {
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.dialogRef.close();
  }
}
