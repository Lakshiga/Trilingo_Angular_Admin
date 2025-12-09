import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { HttpClientService } from '../../services/http-client.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  isSubmitted = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private httpClient: HttpClientService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      this.error = 'Please enter a valid email address.';
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.successMessage = null;

    const email = this.forgotPasswordForm.value.email.trim();

    // TODO: Replace with actual backend endpoint when available
    this.httpClient.post<any, { email: string }>('/auth/forgot-password', { email }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isSubmitted = true;
        this.successMessage = 'If an account exists with this email, we have sent password reset instructions.';
        
        this.snackBar.open('Password reset email sent!', 'Close', { 
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      },
      error: (err: unknown) => {
        this.isLoading = false;
        
        if (err instanceof HttpErrorResponse) {
          if (err.status === 404) {
            // Don't reveal if email exists - security best practice
            this.isSubmitted = true;
            this.successMessage = 'If an account exists with this email, we have sent password reset instructions.';
          } else {
            this.error = this.getUserFriendlyError(err);
          }
        } else {
          this.error = 'An error occurred. Please try again.';
        }
      }
    });
  }

  private getUserFriendlyError(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Unable to connect to the server. Please check your connection and try again.';
    }
    
    if (err.error && err.error.message) {
      return err.error.message;
    }
    
    return 'An error occurred. Please try again later.';
  }

  goBackToLogin(): void {
    this.router.navigate(['/login']);
  }
}


