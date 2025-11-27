import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthApiService } from '../../services/auth-api.service';
import { LoginRequest } from '../../types/auth.types';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCheckboxModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginPageComponent {
  loginForm: FormGroup;
  isLoading = false;
  error: string | null = null;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authApiService: AuthApiService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      identifier: ['admin', [Validators.required]],
      password: ['Admin123!', [Validators.required]],
      rememberMe: [false]
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.error = null;

    const loginRequest: LoginRequest = {
      identifier: this.loginForm.value.identifier,
      password: this.loginForm.value.password
    };

    this.authApiService.login(loginRequest).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          localStorage.setItem('authToken', response.token || '');
          this.authApiService.checkAuthStatus();
          this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
          this.router.navigate(['/dashboard']);
        } else {
          this.error = response.message || 'Invalid credentials or login failed.';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err instanceof Error ? err.message : 'An unexpected error occurred.';
        this.isLoading = false;
        this.error = this.handleError(err);
      }
    });
  }

  private handleError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      // This is a client-side or network error. Could be CORS or server is down.
      return 'Cannot connect to the server. Please check your network or try again later.';
    } else if (error.status === 401) {
      // Unauthorized - typically wrong username/password
      return 'Invalid username or password. Please check your credentials.';
    } else if (error.status >= 500) {
      // Server-side error
      return 'A server error occurred. Please try again in a few moments.';
    } else {
      // Other generic errors
      return 'An unexpected error occurred. Please try again.';
    }
  }
}