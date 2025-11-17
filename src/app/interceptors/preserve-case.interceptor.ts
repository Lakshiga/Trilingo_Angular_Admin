import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs/operators';

export const preserveCaseInterceptor: HttpInterceptorFn = (req, next) => {
  // Log request for debugging
  // console.log('HTTP Request:', req);
  
  // Pass through the request without modification
  return next(req).pipe(
    tap({
      next: (event) => {
        // Log response for debugging
        // console.log('HTTP Response:', event);
      },
      error: (error) => {
        // Log error for debugging
        // console.error('HTTP Error:', error);
      }
    })
  );
};