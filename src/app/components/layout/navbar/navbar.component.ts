import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthApiService } from '../../../services/auth-api.service';
import { Subscription, filter } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Navbar Component
 * 
 * This component handles the main navigation bar for authenticated users.
 * It displays:
 * - Logo
 * - Navigation links (Dashboard, Main Activities, Activity Types, Levels)
 * - User profile dropdown with logout functionality
 * 
 * Best Practices:
 * - Standalone component for better tree-shaking
 * - Proper separation of concerns
 * - Reusable and maintainable
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatButtonModule
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  showProfileDropdown = false;
  profileImageUrl: string | null = null;
  username: string | null = null;
  email: string | null = null;
  private routerSubscription?: Subscription;
  private profileUpdateHandler = () => this.loadProfile();
  private windowFocusHandler = () => this.loadProfile();

  constructor(
    private authApiService: AuthApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    
    // Reload profile when navigating to profile page and back
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Reload profile when navigating (especially after profile update)
        if (event.urlAfterRedirects) {
          setTimeout(() => this.loadProfile(), 300);
        }
      });

    // Reload profile when window gains focus (user comes back to tab)
    window.addEventListener('focus', this.windowFocusHandler);

    // Listen for custom event when profile is updated
    window.addEventListener('profileUpdated', this.profileUpdateHandler);
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    // Remove event listeners
    window.removeEventListener('focus', this.windowFocusHandler);
    window.removeEventListener('profileUpdated', this.profileUpdateHandler);
  }

  private getFullImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    const cacheBuster = `_t=${Date.now()}`;

    // Absolute URL – just append cache buster
    if (/^https?:\/\//i.test(url)) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${cacheBuster}`;
    }

    const cleanedUrl = url.replace(/\\/g, '/');
    const normalisedPath = cleanedUrl.startsWith('/') ? cleanedUrl : `/${cleanedUrl}`;

    const baseFromEnv = (environment.awsBaseUrl || environment.apiUrl || '')
      .replace(/\/api$/, '')
      .replace(/\/$/, '');
    const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseUrl = baseFromEnv || runtimeOrigin;

    const separator = normalisedPath.includes('?') ? '&' : '?';
    return `${baseUrl}${normalisedPath}${separator}${cacheBuster}`;
  }

  loadProfile(): void {
    this.authApiService.getProfile().subscribe({
      next: (response) => {
        if (response.isSuccess) {
          // Prefer backend-provided full URL if available, else build from relative path
          this.profileImageUrl = this.getFullImageUrl(response.fullImageUrl || response.profileImageUrl);
          this.username = response.username || null;
          this.email = response.email || null;
          console.log('Navbar profile loaded:', {
            profileImageUrl: response.profileImageUrl,
            fullImageUrl: response.fullImageUrl,
            resolved: this.profileImageUrl
          });
        }
      },
      error: (error) => {
        console.error('Error loading profile in navbar:', error);
        // Set default values on error
        this.profileImageUrl = null;
        this.username = null;
        this.email = null;
      }
    });
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'https://i.pravatar.cc/40?u=user';
    }
  }

  /**
   * Close dropdown when clicking outside
   * Best Practice: Use HostListener for document-level events
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    // Check if click is outside the dropdown container (including the button)
    const dropdownContainer = document.querySelector('.profile-dropdown-container');
    if (dropdownContainer && !dropdownContainer.contains(target)) {
      this.showProfileDropdown = false;
    }
  }

  /**
   * Toggle profile dropdown visibility
   * Best Practice: Stop event propagation to prevent immediate closing
   */
  toggleProfileDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent event from bubbling to document
    }
    this.showProfileDropdown = !this.showProfileDropdown;
  }


  /**
   * Handle logout action
   * Best Practice: Centralized logout logic
   */
  onLogout(): void {
    this.showProfileDropdown = false;
    this.authApiService.logout();
    this.router.navigate(['/login']);
  }
}

