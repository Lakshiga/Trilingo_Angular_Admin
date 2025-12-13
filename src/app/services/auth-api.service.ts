import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClientService } from './http-client.service';
import { LoginRequest, AuthResponse, UpdateProfileRequest } from '../types/auth.types';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly endpoint = '/auth';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private httpClient: HttpClientService) {
    this.checkAuthStatus();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.httpClient.post<AuthResponse, LoginRequest>(`${this.endpoint}/login`, credentials);
  }

  checkAuthStatus(): void {
    const token = localStorage.getItem('authToken');
    this.isAuthenticatedSubject.next(!!token);
  }

  logout(): void {
    localStorage.removeItem('authToken');
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Get profile with a cache-busting query so CloudFront/S3 cached responses
   * don't return stale profileImageUrl after upload.
   */
  getProfile(): Observable<AuthResponse> {
    const cacheBuster = `?_=${Date.now()}`;
    return this.httpClient.get<AuthResponse>(`${this.endpoint}/profile${cacheBuster}`);
  }

  updateProfile(profileData: UpdateProfileRequest): Observable<AuthResponse> {
    return this.httpClient.put<AuthResponse, UpdateProfileRequest>(`${this.endpoint}/update-profile`, profileData);
  }

  uploadProfileImage(file: File): Observable<AuthResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.httpClient.postFormData<AuthResponse>(`${this.endpoint}/upload-profile-image`, formData);
  }
}
