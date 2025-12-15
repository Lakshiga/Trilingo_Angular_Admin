import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthApiService } from '../../services/auth-api.service';
import { UpdateProfileRequest, AuthResponse } from '../../types/auth.types';
import { environment } from '../../../environments/environment';

/**
 * Profile Component
 * 
 * Allows users to view and edit their profile information:
 * - View current profile (username, email, role, profile image)
 * - Update email
 * - Upload/change profile image
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading = false;
  isUploadingImage = false;
  profileData: any = null;
  profileImageUrl: string | null = null;
  selectedFile: File | null = null;
  previewImageUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authApiService: AuthApiService,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  private getFullImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    // Handle already absolute URLs
    if (/^https?:\/\//i.test(url)) {
      // Add cache busting query parameter to force refresh
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}_t=${Date.now()}`;
    }

    // Replace backslashes from APIs that might return Windows-style paths
    const cleanedUrl = url.replace(/\\/g, '/');

    // Normalise relative paths like "uploads/..." or "/uploads/..."
    const normalisedPath = cleanedUrl.startsWith('/') ? cleanedUrl : `/${cleanedUrl}`;

    // Prefer CloudFront/base API host, fallback to current origin
    const baseFromEnv = (environment.awsBaseUrl || environment.apiUrl || '')
      .replace(/\/api$/, '')
      .replace(/\/$/, '');
    const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseUrl = baseFromEnv || runtimeOrigin;

    // Add cache busting query parameter to force refresh
    const separator = normalisedPath.includes('?') ? '&' : '?';
    return `${baseUrl}${normalisedPath}${separator}_t=${Date.now()}`;
  }

  loadProfile(): void {
    this.isLoading = true;
    this.authApiService.getProfile().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.isSuccess) {
          this.profileData = response;
          // Always update profileImageUrl from database response (never use hardcoded)
          // Only set to null if response doesn't have it, otherwise use the database value
          if (response.profileImageUrl) {
            this.profileImageUrl = this.getFullImageUrl(response.profileImageUrl);
          } else if (this.profileImageUrl) {
            // Keep existing image if API didn’t return one
            this.profileImageUrl = this.getFullImageUrl(this.profileImageUrl);
          } else {
            this.profileImageUrl = null;
          }
          console.log('Profile loaded from database:', {
            email: response.email,
            profileImageUrl: response.profileImageUrl,
            fullImageUrl: this.profileImageUrl,
            username: response.username,
            hasProfileImage: !!response.profileImageUrl
          });
          this.profileForm.patchValue({
            email: response.email || ''
          });
        } else {
          this.showError(response.message || 'Failed to load profile');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.showError('Error loading profile. Please try again.');
        console.error('Profile load error:', error);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showError('Image size should be less than 5MB');
        return;
      }
      
      this.selectedFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewImageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadProfileImage(): void {
    if (!this.selectedFile) {
      this.showError('Please select an image file');
      return;
    }

    // Validate file before upload
    if (!this.selectedFile.type.startsWith('image/')) {
      this.showError('Please select a valid image file');
      return;
    }

    if (this.selectedFile.size > 5 * 1024 * 1024) {
      this.showError('Image size should be less than 5MB');
      return;
    }

    console.log('Uploading profile image:', {
      name: this.selectedFile.name,
      size: this.selectedFile.size,
      type: this.selectedFile.type
    });

    this.isUploadingImage = true;
    this.authApiService.uploadProfileImage(this.selectedFile).subscribe({
      next: (response) => {
        this.isUploadingImage = false;
        if (response.isSuccess) {
          console.log('Upload response received:', {
            isSuccess: response.isSuccess,
            profileImageUrl: response.profileImageUrl,
            message: response.message
          });
          
          // Update profile image URL immediately with full URL (if returned)
          if (response.profileImageUrl) {
            const fullUrl = this.getFullImageUrl(response.profileImageUrl);
            this.profileImageUrl = fullUrl;
            console.log('Updated profileImageUrl:', {
              original: response.profileImageUrl,
              fullUrl: fullUrl
            });
          } else {
            console.warn('No profileImageUrl in upload response');
          }
          
          this.previewImageUrl = null;
          this.selectedFile = null;
          
          // Reset file input to allow uploading the same file again
          const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
          
          this.showSuccess('Profile image uploaded successfully');
          
          // Reload profile to get updated data from database (with cache busting)
          setTimeout(() => {
            this.loadProfile();
          }, 500); // Small delay to ensure backend has processed the update
          
          // Notify navbar to refresh profile image
          window.dispatchEvent(new Event('profileUpdated'));
        } else {
          this.showError(response.message || 'Failed to upload image');
        }
      },
      error: (error: any) => {
        this.isUploadingImage = false;
        
        // Backend now consistently returns AuthResponseDto in error.error for BadRequest (400) and other errors
        // Check if error.error has AuthResponseDto structure
        if (error?.error && typeof error.error === 'object') {
          // Check for AuthResponseDto structure (has isSuccess property)
          if (error.error.isSuccess !== undefined) {
            const response = error.error as AuthResponse;
            this.showError(response.message || 'Failed to upload image');
            console.error('Image upload error (AuthResponse):', response);
            return;
          }
          
          // Check for standard error structure with message
          if (error.error.message) {
            this.showError(error.error.message);
            console.error('Image upload error:', error.error);
            return;
          }
        }
        
        // Handle network errors (status 0)
        if (error?.status === 0) {
          this.showError('Cannot connect to server. Please check your network connection and ensure the backend is running.');
          console.error('Network error - Backend connection failed:', error);
          return;
        }
        
        // Extract error message from response
        let errorMessage = 'Error uploading image. Please try again.';
        
        // Handle different error response structures
        if (error?.error) {
          if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        this.showError(errorMessage);
        console.error('Image upload error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: errorMessage,
          url: error?.url
        });
      }
    });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      this.showError('Please fill in all required fields correctly');
      return;
    }

    this.isLoading = true;
    const updateData: UpdateProfileRequest = {
      email: this.profileForm.value.email
    };
    // Note: ProfileImageUrl is automatically saved to database when image is uploaded
    // So we don't need to send it again in updateProfile

    this.authApiService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.isSuccess) {
          // Reload profile to get latest data from database (including profileImageUrl)
          this.loadProfile();
          this.showSuccess('Profile updated successfully');
          // Notify navbar to refresh profile image
          window.dispatchEvent(new Event('profileUpdated'));
        } else {
          this.showError(response.message || 'Failed to update profile');
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        
        // Handle error response structure
        let errorMessage = 'Error updating profile. Please try again.';
        if (error?.error) {
          if (error.error.isSuccess !== undefined) {
            // AuthResponseDto structure
            const response = error.error as AuthResponse;
            if (!response.isSuccess) {
              errorMessage = response.message || errorMessage;
            }
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        this.showError(errorMessage);
        console.error('Profile update error:', error);
      }
    });
  }

  removeImagePreview(): void {
    this.selectedFile = null;
    this.previewImageUrl = null;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      // Only use fallback if we don't have a profileImageUrl from database
      if (!this.profileImageUrl) {
        img.src = 'https://i.pravatar.cc/150?u=user';
      }
    }
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }
}

