import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthApiService } from '../../../services/auth-api.service';

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
export class NavbarComponent implements OnInit {
  showProfileDropdown = false;

  constructor(
    private authApiService: AuthApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Component initialization if needed
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
   * Handle profile update action
   * TODO: Implement profile update functionality
   */
  onUpdateProfile(): void {
    this.showProfileDropdown = false;
    // TODO: Navigate to profile page or open profile modal
    console.log('Update profile clicked');
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

