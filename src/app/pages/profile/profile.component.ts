import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ChangePasswordDialogComponent } from './change-password-dialog.component';
import { ImageCropDialogComponent } from './image-crop-dialog.component';
import { AuthApiService } from '../../services/auth-api.service';
import { HttpClientService } from '../../services/http-client.service';

interface UserProfile {
  username: string;
  email: string;
  profileImageUrl?: string | null;
  role?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule, MatDialogModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  userProfile: UserProfile | null = null;
  isLoading = false;
  profileImageUrl: string | null = null;
  defaultProfileImage = '/assets/images/default-profile.svg'; // Default blank profile image
  
  // Image modal
  showImageModal = false;
  previewImageUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authApiService: AuthApiService,
    private httpClient: HttpClientService,
    public router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.profileForm = this.fb.group({
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.isLoading = true;
    
    this.httpClient.get<any>('/auth/profile').subscribe({
      next: (response) => {
          this.userProfile = {
            username: response.username || '',
            email: response.email || '',
            profileImageUrl: response.profileImageUrl,
            role: response.role
          };
          
          // Update profile image URL - ensure it has full URL if it's a relative path
          let imageUrl = response.profileImageUrl || this.defaultProfileImage;
          if (imageUrl && imageUrl.startsWith('/uploads') && !imageUrl.startsWith('http')) {
            // Add base URL for local development
            const baseUrl = 'http://localhost:5166';
            imageUrl = `${baseUrl}${imageUrl}`;
          }
          
          this.profileImageUrl = imageUrl;
          
          // Update userProfile with the full URL
          if (this.userProfile) {
            this.userProfile.profileImageUrl = imageUrl;
          }
          
          this.profileForm.patchValue({
            username: this.userProfile.username,
            email: this.userProfile.email
          });
          
          // Store username in localStorage if not present
          if (!localStorage.getItem('username')) {
            localStorage.setItem('username', this.userProfile.username);
          }
          
          this.isLoading = false;
        },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.snackBar.open('Failed to load profile', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      // Open crop dialog
      this.openCropDialog(file);
    }
  }

  openCropDialog(file: File): void {
    const dialogRef = this.dialog.open(ImageCropDialogComponent, {
      width: '90vw',
      maxWidth: '600px',
      data: { imageFile: file },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((croppedFile: File | undefined) => {
      if (croppedFile) {
        // Upload the cropped image
        this.uploadProfileImage(croppedFile);
      }
    });
  }

  openImageModal(): void {
    this.showImageModal = true;
    this.previewImageUrl = null;
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.previewImageUrl = null;
  }

  removeProfileImage(): void {
    // TODO: Implement remove profile image API call
    this.profileImageUrl = this.defaultProfileImage;
    if (this.userProfile) {
      this.userProfile.profileImageUrl = null;
    }
    this.closeImageModal();
    this.snackBar.open('Profile image removed', 'Close', { duration: 3000 });
  }


  uploadProfileImage(file: File): void {
    this.isLoading = true;
    const formData = new FormData();
    formData.append('file', file);

    this.httpClient.post<any, FormData>('/auth/upload-profile-image', formData).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          // Update the profile image URL immediately - ensure it has full URL if it's a relative path
          let imageUrl = response.profileImageUrl || this.defaultProfileImage;
          if (imageUrl && imageUrl.startsWith('/uploads') && !imageUrl.startsWith('http')) {
            // Add base URL for local development
            const baseUrl = 'http://localhost:5166';
            imageUrl = `${baseUrl}${imageUrl}`;
          }
          
          this.profileImageUrl = imageUrl;
          
          // Update userProfile to reflect the change
          if (this.userProfile) {
            this.userProfile.profileImageUrl = imageUrl;
          }
          
          // Reload full profile to get latest data
          this.loadUserProfile();
          
          this.snackBar.open('Profile image updated successfully', 'Close', { duration: 2000 });
          
          // Navigate to profile page immediately (dialog already closed)
          setTimeout(() => {
            this.router.navigate(['/profile']);
          }, 500);
        } else {
          this.snackBar.open(response.message || 'Failed to upload image', 'Close', { duration: 3000 });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error uploading image:', err);
        this.snackBar.open('Failed to upload profile image', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Check if username or email changed
    const usernameChanged = this.profileForm.value.username !== this.userProfile?.username;
    const emailChanged = this.profileForm.value.email !== this.userProfile?.email;

    if (!usernameChanged && !emailChanged) {
      // No changes, just exit/navigate back
      this.router.navigate(['/dashboard']);
      return;
    }

    this.isLoading = true;
    const updateData: any = {};
    
    if (usernameChanged) {
      updateData.username = this.profileForm.value.username;
    }
    if (emailChanged) {
      updateData.email = this.profileForm.value.email;
    }

    this.httpClient.put<any, any>('/auth/update-profile', updateData).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          // Update localStorage if username changed
          if (usernameChanged && response.username) {
            localStorage.setItem('username', response.username);
          }
          this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
          // Reload profile to get latest data including profile image
          this.loadUserProfile();
          // Navigate back to dashboard after a short delay
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
        } else {
          this.snackBar.open(response.message || 'Failed to update profile', 'Close', { duration: 3000 });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error updating profile:', err);
        let errorMessage = 'Failed to update profile';
        if (err.error) {
          if (err.error.message) {
            errorMessage = err.error.message;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.error) {
            errorMessage = err.error.error;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        this.snackBar.open(errorMessage, 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  getProfileImageUrl(): string {
    return this.profileImageUrl || this.defaultProfileImage;
  }

  openChangePasswordDialog(): void {
    const dialogRef = this.dialog.open(ChangePasswordDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        // Success message is shown in the dialog component
      }
    });
  }

  logout(): void {
    this.authApiService.logout();
    this.router.navigate(['/login']);
  }
}


