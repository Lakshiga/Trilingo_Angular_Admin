import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthApiService } from './services/auth-api.service';
import { NavbarComponent } from './components/layout/navbar/navbar.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { filter, take } from 'rxjs/operators';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * App Component (Root Component)
 * 
 * Security Best Practices Applied:
 * - Authentication check before rendering protected content
 * - Loading state to prevent content flash
 * - No protected content visible until authenticated
 * - Proper route-based layout switching
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    MatProgressSpinnerModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isPublicRoute = false;
  isAuthenticated$: Observable<boolean>;
  isInitializing = true; // Critical: Prevent content flash during auth check

  // Define all public routes that should not show the navbar
  // Best Practice: Centralized configuration
  private readonly publicRoutes = ['/login', '/forgot-password', '/register', '/reset-password'];

  constructor(
    private authApiService: AuthApiService,
    private router: Router
  ) {
    this.isAuthenticated$ = this.authApiService.isAuthenticated$;
    
    // Track current route to determine if we're on a public route
    // Best Practice: Subscribe to router events for reactive updates
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const currentUrl = event.urlAfterRedirects || event.url;
      this.isPublicRoute = this.isPublicRouteUrl(currentUrl);
    });
  }

  ngOnInit(): void {
    // CRITICAL SECURITY: Check authentication status FIRST
    this.authApiService.checkAuthStatus();
    
    // Check initial route
    this.isPublicRoute = this.isPublicRouteUrl(this.router.url);
    
    // Wait for initial auth check to complete before showing content
    // This prevents protected content from flashing
    this.isAuthenticated$.pipe(
      take(1)
    ).subscribe(() => {
      // Small delay to ensure auth state is fully initialized
      setTimeout(() => {
        this.isInitializing = false;
      }, 50);
    });
  }

  /**
   * Check if the current URL is a public route
   * Best Practice: Private method with clear documentation
   * @param url The URL to check
   * @returns true if the URL is a public route, false otherwise
   */
  private isPublicRouteUrl(url: string): boolean {
    // Remove query parameters and hash for comparison
    const cleanUrl = url.split('?')[0].split('#')[0];
    return this.publicRoutes.some(route => {
      // Exact match
      if (cleanUrl === route) {
        return true;
      }
      // Check if URL starts with the route followed by a slash
      if (cleanUrl.startsWith(route + '/')) {
        return true;
      }
      return false;
    });
  }
}