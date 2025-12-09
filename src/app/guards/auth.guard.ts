import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { AuthApiService } from '../services/auth-api.service';

/**
 * Auth Guard - Security Best Practices
 * 
 * CRITICAL: Prevents unauthorized access to protected routes
 * - Checks authentication before allowing route activation
 * - Redirects to login if not authenticated
 * - No content flash - blocks route before rendering
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authApiService: AuthApiService,
    private router: Router
  ) {
    // Ensure auth status is checked when guard is instantiated
    this.authApiService.checkAuthStatus();
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // CRITICAL: Check auth status before allowing route
    this.authApiService.checkAuthStatus();
    
    return this.authApiService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          // SECURITY: Store attempted URL for redirect after login
          const returnUrl = state.url;
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: returnUrl },
            replaceUrl: true // Prevent back button from accessing protected route
          });
          return false;
        }
        return true;
      })
    );
  }
}
