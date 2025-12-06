import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
// MatTypographyModule is not available in Angular Material v19
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthApiService } from './services/auth-api.service';
import { HttpClientService } from './services/http-client.service';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isAuthenticated$: Observable<boolean>;
  isLoginPage = false;
  userProfile: any = null;
  defaultProfileImage = '/assets/images/default-profile.svg';

  constructor(
    private authApiService: AuthApiService,
    private httpClient: HttpClientService,
    public router: Router
  ) {
    this.isAuthenticated$ = this.authApiService.isAuthenticated$;
    
    // Track current route to determine if we're on login page
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isLoginPage = event.url === '/login' || event.urlAfterRedirects === '/login';
      if (!this.isLoginPage) {
        this.loadUserProfile();
      }
    });
  }

  ngOnInit(): void {
    // Check authentication status on app initialization
    this.authApiService.checkAuthStatus();
    // Check initial route
    this.isLoginPage = this.router.url === '/login';
    if (!this.isLoginPage) {
      this.loadUserProfile();
    }
  }

  loadUserProfile(): void {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    this.httpClient.get<any>('/auth/profile').subscribe({
      next: (response) => {
        // Ensure profile image URL has full URL if it's a relative path
        let profileImageUrl = response.profileImageUrl;
        if (profileImageUrl && profileImageUrl.startsWith('/uploads') && !profileImageUrl.startsWith('http')) {
          const baseUrl = 'http://localhost:5166';
          profileImageUrl = `${baseUrl}${profileImageUrl}`;
        }
        
        this.userProfile = {
          username: response.username || 'Admin',
          email: response.email || '',
          profileImageUrl: profileImageUrl,
          role: response.role
        };
        if (this.userProfile.username) {
          localStorage.setItem('username', this.userProfile.username);
        }
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        // Set default values
        this.userProfile = {
          username: 'Admin',
          email: '',
          profileImageUrl: null,
          role: 'Admin'
        };
      }
    });
  }

  getProfileImageUrl(): string {
    return this.userProfile?.profileImageUrl || this.defaultProfileImage;
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }
}