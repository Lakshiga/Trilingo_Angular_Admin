import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
// MatTypographyModule is not available in Angular Material v19
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthApiService } from './services/auth-api.service';
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
  showProfileDropdown = false;
  isLoginPage = false;

  constructor(
    private authApiService: AuthApiService,
    public router: Router
  ) {
    this.isAuthenticated$ = this.authApiService.isAuthenticated$;
    
    // Track current route to determine if we're on login page
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isLoginPage = event.url === '/login' || event.urlAfterRedirects === '/login';
    });
  }

  ngOnInit(): void {
    // Check authentication status on app initialization
    this.authApiService.checkAuthStatus();
    // Check initial route
    this.isLoginPage = this.router.url === '/login';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const profileDropdown = document.querySelector('.profile-dropdown');
    if (profileDropdown && !profileDropdown.contains(event.target as Node)) {
      this.showProfileDropdown = false;
    }
  }

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  updateProfile(): void {
    this.showProfileDropdown = false;
    // TODO: Implement profile update functionality
    console.log('Update profile clicked');
  }

  logout(): void {
    // Only logout when explicitly called from logout button
    this.showProfileDropdown = false;
    this.authApiService.logout();
    this.router.navigate(['login']);
  }
}