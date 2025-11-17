import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ActivityUpdate {
  id: number;
  type: 'created' | 'updated' | 'deleted';
  data?: any;
}

export interface ExerciseUpdate {
  id: number;
  type: 'created' | 'updated' | 'deleted';
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: HubConnection | null = null;
  private activityUpdatesSubject = new Subject<ActivityUpdate>();
  private exerciseUpdatesSubject = new Subject<ExerciseUpdate>();
  private connectionStatusSubject = new Subject<boolean>();

  public activityUpdates$: Observable<ActivityUpdate> = this.activityUpdatesSubject.asObservable();
  public exerciseUpdates$: Observable<ExerciseUpdate> = this.exerciseUpdatesSubject.asObservable();
  public connectionStatus$: Observable<boolean> = this.connectionStatusSubject.asObservable();

  constructor() {
    this.initializeConnection();
  }

  private getHubUrl(): string {
    // Detect if running on CloudFront (runtime detection takes priority)
    const isCloudFront = typeof window !== 'undefined' && 
                        (window.location.hostname.includes('cloudfront.net') || 
                         window.location.hostname === 'd3v81eez8ecmto.cloudfront.net' ||
                         window.location.hostname.endsWith('cloudfront.net'));

    if (isCloudFront || environment.production) {
      // Use CloudFront URL for SignalR
      return 'https://d3v81eez8ecmto.cloudfront.net/adminhub';
    } else {
      // Development: use local backend
      const baseUrl = environment.apiUrl || 'http://localhost:5166/api';
      return baseUrl.replace('/api', '') + '/adminhub';
    }
  }

  private async initializeConnection(): Promise<void> {
    if (this.hubConnection) {
      return;
    }

    const hubUrl = this.getHubUrl();
    
    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');
    
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token || '',
        withCredentials: true
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          // Exponential backoff: 0s, 2s, 10s, 30s, then 30s intervals
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          return 30000;
        }
      })
      .build();

    // Register event handlers
    this.setupEventHandlers();

    // Start connection
    try {
      await this.hubConnection.start();
      await this.hubConnection.invoke('JoinAdminGroup');
      this.connectionStatusSubject.next(true);
      console.log('[SignalR] Connected to admin hub');
    } catch (error) {
      console.error('[SignalR] Error connecting:', error);
      this.connectionStatusSubject.next(false);
    }

    // Handle reconnection
    this.hubConnection.onreconnecting(() => {
      console.log('[SignalR] Reconnecting...');
      this.connectionStatusSubject.next(false);
    });

    this.hubConnection.onreconnected(() => {
      console.log('[SignalR] Reconnected');
      this.hubConnection?.invoke('JoinAdminGroup');
      this.connectionStatusSubject.next(true);
    });

    this.hubConnection.onclose((error) => {
      console.log('[SignalR] Connection closed', error);
      this.connectionStatusSubject.next(false);
    });
  }

  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    // Activity events
    this.hubConnection.on('ActivityCreated', (activity: any) => {
      this.activityUpdatesSubject.next({
        id: activity.id,
        type: 'created',
        data: activity
      });
    });

    this.hubConnection.on('ActivityUpdated', (activity: any) => {
      this.activityUpdatesSubject.next({
        id: activity.id,
        type: 'updated',
        data: activity
      });
    });

    this.hubConnection.on('ActivityDeleted', (activityId: number) => {
      this.activityUpdatesSubject.next({
        id: activityId,
        type: 'deleted'
      });
    });

    // Exercise events
    this.hubConnection.on('ExerciseCreated', (exercise: any) => {
      this.exerciseUpdatesSubject.next({
        id: exercise.id,
        type: 'created',
        data: exercise
      });
    });

    this.hubConnection.on('ExerciseUpdated', (exercise: any) => {
      this.exerciseUpdatesSubject.next({
        id: exercise.id,
        type: 'updated',
        data: exercise
      });
    });

    this.hubConnection.on('ExerciseDeleted', (exerciseId: number) => {
      this.exerciseUpdatesSubject.next({
        id: exerciseId,
        type: 'deleted'
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === HubConnectionState.Connected) {
      await this.hubConnection.invoke('LeaveAdminGroup');
      await this.hubConnection.stop();
      this.hubConnection = null;
      this.connectionStatusSubject.next(false);
    }
  }

  isConnected(): boolean {
    return this.hubConnection?.state === HubConnectionState.Connected;
  }

  async reconnect(): Promise<void> {
    if (this.hubConnection && this.hubConnection.state !== HubConnectionState.Connected) {
      try {
        await this.hubConnection.start();
        await this.hubConnection.invoke('JoinAdminGroup');
        this.connectionStatusSubject.next(true);
      } catch (error) {
        console.error('[SignalR] Reconnection failed:', error);
      }
    } else if (!this.hubConnection) {
      await this.initializeConnection();
    }
  }
}

