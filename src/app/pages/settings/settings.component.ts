import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { AuthApiService } from '../../services/auth-api.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

/**
 * Settings Component
 * 
 * Provides comprehensive settings for the admin panel:
 * - Theme preferences (Dark/Light mode)
 * - Language preferences
 * - Notification settings
 * - Change password
 * - Profile settings
 * - API configuration (for developers)
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  settingsForm: FormGroup;
  passwordForm: FormGroup;
  isLoading = false;
  
  // Available languages
  languages = [
    { code: 'en', name: 'English' },
    { code: 'ta', name: 'Tamil' },
    { code: 'si', name: 'Sinhala' }
  ];

  // Account information
  lastLoginDate: string = '';

  constructor(
    private fb: FormBuilder,
    private authApiService: AuthApiService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    // Load saved settings from localStorage
    const savedSettings = this.loadSettings();
    
    this.settingsForm = this.fb.group({
      darkMode: [savedSettings.darkMode || false],
      language: [savedSettings.language || environment.defaultLanguage],
      notifications: [savedSettings.notifications !== false], // Default true
      emailNotifications: [savedSettings.emailNotifications || false],
      autoSave: [savedSettings.autoSave !== false], // Default true
      itemsPerPage: [savedSettings.itemsPerPage || 10],
      apiUrl: [localStorage.getItem('apiUrl') || environment.apiUrl]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Apply saved theme on load
    this.applyTheme(this.settingsForm.value.darkMode);
    
    // Watch for dark mode changes
    this.settingsForm.get('darkMode')?.valueChanges.subscribe(isDark => {
      this.applyTheme(isDark);
    });

    // Get last login date from localStorage or use current date
    const savedLastLogin = localStorage.getItem('lastLoginDate');
    this.lastLoginDate = savedLastLogin 
      ? new Date(savedLastLogin).toLocaleString() 
      : new Date().toLocaleString();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): any {
    const saved = localStorage.getItem('adminSettings');
    return saved ? JSON.parse(saved) : {};
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    const settings = {
      darkMode: this.settingsForm.value.darkMode,
      language: this.settingsForm.value.language,
      notifications: this.settingsForm.value.notifications,
      emailNotifications: this.settingsForm.value.emailNotifications,
      autoSave: this.settingsForm.value.autoSave,
      itemsPerPage: this.settingsForm.value.itemsPerPage
    };
    localStorage.setItem('adminSettings', JSON.stringify(settings));
  }

  /**
   * Apply theme to document
   */
  private applyTheme(isDark: boolean): void {
    const htmlElement = document.documentElement;
    if (isDark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }

  /**
   * Password match validator
   */
  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  /**
   * Save general settings
   */
  onSaveSettings(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    
    // Save to localStorage
    this.saveSettings();
    
    // Save API URL if changed
    const apiUrl = this.settingsForm.value.apiUrl;
    if (apiUrl && apiUrl.startsWith('http')) {
      localStorage.setItem('apiUrl', apiUrl);
    }

    // Simulate save (replace with actual API call if needed)
    setTimeout(() => {
      this.isLoading = false;
      this.snackBar.open('Settings saved successfully!', 'Close', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }, 500);
  }

  /**
   * Change password
   */
  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    // TODO: Implement actual password change API call
    // this.authApiService.changePassword({
    //   currentPassword: this.passwordForm.value.currentPassword,
    //   newPassword: this.passwordForm.value.newPassword
    // }).subscribe({
    //   next: () => {
    //     this.isLoading = false;
    //     this.snackBar.open('Password changed successfully!', 'Close', { duration: 3000 });
    //     this.passwordForm.reset();
    //   },
    //   error: (error) => {
    //     this.isLoading = false;
    //     this.snackBar.open(error.message || 'Failed to change password', 'Close', { duration: 3000 });
    //   }
    // });

    // Temporary simulation
    setTimeout(() => {
      this.isLoading = false;
      this.snackBar.open('Password change functionality will be implemented soon', 'Close', {
        duration: 3000
      });
      this.passwordForm.reset();
    }, 1000);
  }

  /**
   * Reset settings to default
   */
  onResetSettings(): void {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      localStorage.removeItem('adminSettings');
      localStorage.removeItem('apiUrl');
      this.settingsForm.patchValue({
        darkMode: false,
        language: environment.defaultLanguage,
        notifications: true,
        emailNotifications: false,
        autoSave: true,
        itemsPerPage: 10,
        apiUrl: environment.apiUrl
      });
      this.applyTheme(false);
      this.snackBar.open('Settings reset to default', 'Close', { duration: 3000 });
    }
  }

  /**
   * Get password error message
   */
  getPasswordError(): string {
    const control = this.passwordForm.get('confirmPassword');
    if (control?.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }
    return '';
  }
}

