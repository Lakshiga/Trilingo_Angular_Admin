import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClientService } from '../../services/http-client.service';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 class="dialog-title">Change Password</h2>
        <button type="button" class="dialog-close" (click)="closeDialog()">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form [formGroup]="changePasswordForm" (ngSubmit)="changePassword()" class="dialog-form">
        <div class="form-group">
          <label for="currentPassword" class="form-label">Current Password</label>
          <input 
            type="password" 
            id="currentPassword" 
            formControlName="currentPassword"
            class="form-input"
            [class.input-error]="changePasswordForm.get('currentPassword')?.invalid && changePasswordForm.get('currentPassword')?.touched"
            placeholder="Enter current password"
          />
          <div *ngIf="changePasswordForm.get('currentPassword')?.invalid && changePasswordForm.get('currentPassword')?.touched" class="error-message">
            Current password is required
          </div>
        </div>

        <div class="form-group">
          <label for="newPassword" class="form-label">New Password</label>
          <input 
            type="password" 
            id="newPassword" 
            formControlName="newPassword"
            class="form-input"
            [class.input-error]="changePasswordForm.get('newPassword')?.invalid && changePasswordForm.get('newPassword')?.touched"
            placeholder="Enter new password"
            (input)="checkPasswordStrength()"
          />
          <!-- Password Strength Indicator -->
          <div *ngIf="changePasswordForm.get('newPassword')?.value" class="password-strength">
            <div class="strength-bar">
              <div class="strength-fill" [class]="'strength-' + passwordStrength"></div>
            </div>
            <p class="strength-text">{{ passwordStrengthText }}</p>
          </div>
          <div *ngIf="changePasswordForm.get('newPassword')?.invalid && changePasswordForm.get('newPassword')?.touched" class="error-message">
            New password must be at least 6 characters
          </div>
        </div>

        <div class="form-group">
          <label for="confirmPassword" class="form-label">Confirm New Password</label>
          <input 
            type="password" 
            id="confirmPassword" 
            formControlName="confirmPassword"
            class="form-input"
            [class.input-error]="changePasswordForm.get('confirmPassword')?.invalid && changePasswordForm.get('confirmPassword')?.touched"
            placeholder="Confirm new password"
          />
          <div *ngIf="changePasswordForm.get('confirmPassword')?.hasError('passwordMismatch') && changePasswordForm.get('confirmPassword')?.touched" class="error-message">
            Passwords do not match
          </div>
          <div *ngIf="changePasswordForm.get('confirmPassword')?.invalid && !changePasswordForm.get('confirmPassword')?.hasError('passwordMismatch') && changePasswordForm.get('confirmPassword')?.touched" class="error-message">
            Please confirm your new password
          </div>
        </div>

        <div class="dialog-actions">
          <button 
            type="button"
            (click)="closeDialog()"
            class="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            [disabled]="changePasswordForm.invalid || isChangingPassword"
            class="btn btn-primary"
          >
            {{ isChangingPassword ? 'Updating...' : 'Update Password' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 0;
      min-width: 400px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .dialog-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .dialog-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      color: #6b7280;
      transition: all 0.2s;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dialog-close:hover {
      color: #111827;
      background: #f3f4f6;
    }

    .dialog-form {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1.5px solid #e5e7eb;
      border-radius: 12px;
      font-size: 0.875rem;
      transition: all 0.2s;
      background: white;
      color: #111827;
    }

    .form-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-input.input-error {
      border-color: #ef4444;
    }

    .password-strength {
      margin-top: 0.5rem;
    }

    .strength-bar {
      width: 100%;
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
    }

    .strength-fill {
      height: 100%;
      transition: width 0.3s, background-color 0.3s;
      border-radius: 2px;
    }

    .strength-weak {
      width: 33%;
      background: #ef4444;
    }

    .strength-medium {
      width: 66%;
      background: #f59e0b;
    }

    .strength-strong {
      width: 100%;
      background: #10b981;
    }

    .strength-text {
      font-size: 0.75rem;
      color: #6b7280;
      margin: 0.25rem 0 0 0;
    }

    .error-message {
      font-size: 0.75rem;
      color: #ef4444;
      margin: 0;
    }

    .dialog-actions {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      flex: 1;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
    }

    .btn-primary:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: white;
      color: #374151;
      border: 1.5px solid #e5e7eb;
    }

    .btn-secondary:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
  `]
})
export class ChangePasswordDialogComponent implements OnInit {
  changePasswordForm: FormGroup;
  isChangingPassword = false;
  passwordStrength: 'weak' | 'medium' | 'strong' = 'weak';
  passwordStrengthText = '';

  constructor(
    private fb: FormBuilder,
    private httpClient: HttpClientService,
    private dialogRef: MatDialogRef<ChangePasswordDialogComponent>,
    private snackBar: MatSnackBar
  ) {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {}

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    if (newPassword && confirmPassword) {
      if (newPassword.value && confirmPassword.value && newPassword.value !== confirmPassword.value) {
        confirmPassword.setErrors({ passwordMismatch: true });
        return { passwordMismatch: true };
      } else {
        if (confirmPassword.hasError('passwordMismatch')) {
          confirmPassword.setErrors(null);
        }
      }
    }
    return null;
  }

  checkPasswordStrength(): void {
    const password = this.changePasswordForm.get('newPassword')?.value || '';
    
    if (password.length === 0) {
      this.passwordStrength = 'weak';
      this.passwordStrengthText = '';
      return;
    }

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) {
      this.passwordStrength = 'weak';
      this.passwordStrengthText = 'Weak password';
    } else if (strength <= 3) {
      this.passwordStrength = 'medium';
      this.passwordStrengthText = 'Medium strength';
    } else {
      this.passwordStrength = 'strong';
      this.passwordStrengthText = 'Strong password';
    }
  }

  changePassword(): void {
    if (this.changePasswordForm.invalid) {
      Object.keys(this.changePasswordForm.controls).forEach(key => {
        this.changePasswordForm.get(key)?.markAsTouched();
      });
      return;
    }

    if (this.changePasswordForm.value.currentPassword === this.changePasswordForm.value.newPassword) {
      this.snackBar.open('New password must be different from current password', 'Close', { duration: 3000 });
      return;
    }

    this.isChangingPassword = true;
    const changePasswordData = {
      currentPassword: this.changePasswordForm.value.currentPassword,
      newPassword: this.changePasswordForm.value.newPassword
    };

    this.httpClient.put<any, any>('/auth/change-password', changePasswordData).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.dialogRef.close('success');
        } else {
          this.snackBar.open(response.message || 'Failed to change password', 'Close', { duration: 3000 });
        }
        this.isChangingPassword = false;
      },
      error: (err) => {
        console.error('Error changing password:', err);
        let errorMessage = 'Failed to change password';
        if (err.error?.message) {
          errorMessage = err.error.message;
        }
        this.snackBar.open(errorMessage, 'Close', { duration: 3000 });
        this.isChangingPassword = false;
      }
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}

