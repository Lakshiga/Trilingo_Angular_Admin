import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClientService } from './http-client.service';
import { LoginRequest, AuthResponse } from '../types/auth.types';

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
}
