import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
    RouterLink,
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
export class LoginPageComponent implements OnInit {
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

  ngOnInit(): void {
    // Load saved credentials if "Remember Me" was checked previously
    const savedIdentifier = localStorage.getItem('rememberedIdentifier');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedIdentifier && savedPassword) {
      this.loginForm.patchValue({
        identifier: savedIdentifier,
        password: savedPassword,
        rememberMe: true
      });
    }
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

          // Handle "Remember Me" functionality
          if (this.loginForm.value.rememberMe) {
            // Save credentials to localStorage
            localStorage.setItem('rememberedIdentifier', loginRequest.identifier);
            localStorage.setItem('rememberedPassword', loginRequest.password);
          } else {
            // Remove saved credentials if "Remember Me" is unchecked
            localStorage.removeItem('rememberedIdentifier');
            localStorage.removeItem('rememberedPassword');
          }

          this.router.navigate(['/dashboard']);
        } else {
          this.error = response.message || 'Invalid credentials or login failed.';
        }
        this.isLoading = false;
      },
      error: (err: unknown) => {
        this.isLoading = false;
        if (err instanceof HttpErrorResponse) {
          this.error = this.handleError(err);
        } else if (err instanceof Error) {
          this.error = err.message || 'An unexpected error occurred.';
        } else {
          this.error = 'An unexpected error occurred. Please try again.';
        }
      }
    });
  }

  private handleError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      // Network error (status 0) - Backend not running, CORS, or connection issue
      const errorMessage = error.error?.error || error.message || '';
      
      // Extract base URL from error message if available
      let baseUrl = 'the backend server';
      if (errorMessage.includes('localhost:5166')) {
        baseUrl = 'http://localhost:5166';
      } else if (errorMessage.includes('localhost')) {
        const match = errorMessage.match(/localhost:\d+/);
        if (match) baseUrl = `http://${match[0]}`;
      }
      
      // More user-friendly error message with actionable steps
      return `Cannot connect to the server. Please check your network or try again later.

🔧 Quick Fix Steps:
1. Make sure backend is running: Open http://localhost:5166/swagger in browser
2. Start backend: cd Trilingo_Backend/TES_Learning_App.API && dotnet run
3. Check if port 5166 is correct
4. Look for CORS errors in browser console (F12)`;
    } else if (error.status === 401) {
      // Unauthorized - typically wrong username/password
      return 'Invalid username or password. Please check your credentials.';
    } else if (error.status >= 500) {
      // Server-side error
      return 'A server error occurred. Please try again in a few moments.';
    } else {
      // Other generic errors - try to extract meaningful message
      const serverMessage = error.error?.error || error.error?.message || error.message;
      return serverMessage || 'An unexpected error occurred. Please try again.';
    }
  }
}