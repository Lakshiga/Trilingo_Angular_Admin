import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HttpClientService {
  private baseUrl: string;

  constructor(private http: HttpClient) {
    // Detect if running on CloudFront (runtime detection takes priority)
    const isCloudFront = typeof window !== 'undefined' && 
                        (window.location.hostname.includes('cloudfront.net') || 
                         window.location.hostname === 'd3v81eez8ecmto.cloudfront.net' ||
                         window.location.hostname.endsWith('cloudfront.net'));

    // Determine base URL based on environment and runtime conditions
    if (isCloudFront || environment.production) {
      // Production or CloudFront: Always use CloudFront API
      this.baseUrl = 'https://d3v81eez8ecmto.cloudfront.net/api';
      console.info(`[HttpClientService] CloudFront/Production mode detected. Using: ${this.baseUrl}`);
    } else {
      // Development: Use local backend or allow runtime overrides
      this.baseUrl = environment.apiUrl || 'http://localhost:5166/api';
      
      // Allow runtime override via localStorage (helps when backend runs on a different port)
      // Key: "apiUrl" e.g. http://localhost:64288/api
      const storedUrl = (typeof window !== 'undefined') ? localStorage.getItem('apiUrl') : null;
      if (storedUrl && storedUrl.startsWith('http')) {
        this.baseUrl = storedUrl.replace(/\/$/, '').replace(/\/api$/, '') + '/api';
        console.info(`[HttpClientService] Using apiUrl from localStorage: ${this.baseUrl}`);
      } else if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          // If running on localhost but not the Angular dev port (4200), prefer same-origin API.
          // This covers cases where the admin app is hosted by the backend (e.g., http://localhost:64288).
          const port = window.location.port;
          if (port && port !== '4200') {
            this.baseUrl = `${window.location.origin.replace(/\/$/, '')}/api`;
          }
        }
      }
    }
    
    // Ensure baseUrl doesn't end with double /api and is properly formatted
    this.baseUrl = this.baseUrl.replace(/\/api\/api$/, '/api').replace(/\/$/, '');
    
    console.info(`[HttpClientService] Final Base URL: ${this.baseUrl}`);
    console.info(`[HttpClientService] Current hostname: ${typeof window !== 'undefined' ? window.location.hostname : 'N/A'}`);
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  post<T, TBody>(endpoint: string, body: TBody): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  put<T, TBody>(endpoint: string, body: TBody): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  delete(endpoint: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'A network or unknown error occurred.';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}