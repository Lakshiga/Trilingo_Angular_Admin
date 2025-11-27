import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
// MatTypographyModule is not available in Angular Material v19
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthApiService } from '../../services/auth-api.service';
import { LoginRequest } from '../../types/auth.types';

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
    MatSnackBarModule
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
      password: ['Admin123!', [Validators.required]]
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
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
          this.error = response.message || 'Login failed.';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err instanceof Error ? err.message : 'An unexpected error occurred.';
        this.isLoading = false;
      }
    });
  }
}