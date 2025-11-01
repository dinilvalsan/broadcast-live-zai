// src/app/components/viewer/viewer.component.ts
import { Component, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, ViewChild, ElementRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import RealtimeKitClient from '@cloudflare/realtimekit';
import { RealtimeApiService } from '../../services/realtime-api.service';

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="viewer-container">
      <div *ngIf="!joined" class="join-screen">
        <h1>Join Live Broadcast</h1>
        <input 
          [(ngModel)]="viewerName" 
          placeholder="Your name"
          class="input-field"
          (keyup.enter)="joinBroadcast()"
        />
        <input 
          *ngIf="!meetingIdFromUrl"
          [(ngModel)]="meetingId" 
          placeholder="Meeting ID"
          class="input-field"
        />
        <button (click)="joinBroadcast()" class="btn-primary" [disabled]="loading">
          {{ loading ? 'Joining...' : 'Join Broadcast' }}
        </button>
        <p *ngIf="error" class="error">{{ error }}</p>
      </div>

      <div *ngIf="joined" class="broadcast-container">
        <!-- Header Bar -->
        <div class="broadcast-header">
          <div class="header-content">
            <div class="live-badge">
              <span class="live-dot"></span>
              <span>LIVE</span>
            </div>
            <div class="viewer-badge">
              <span class="icon">👁️</span>
              <span>Viewing</span>
            </div>
          </div>
          <div class="header-actions">
            <button (click)="leaveBroadcast()" class="btn-end">Leave</button>
          </div>
        </div>

        <div class="meeting-layout">
          <rtk-ui-provider #rtkProvider id="viewer-provider" class="provider-container">
            <!-- Chat Section (Top on Mobile) -->
            <div class="chat-section">
              <div class="chat-header">
                <h3>💬 Chat</h3>
              </div>
              <rtk-chat id="viewer-chat" class="chat-component"></rtk-chat>
            </div>

            <!-- Video Section (Bottom on Mobile) -->
            <div class="video-section">
              <div *ngIf="!hostParticipant" class="waiting-message">
                <div class="waiting-content">
                  <div class="spinner"></div>
                  <p>Waiting for host to start broadcasting...</p>
                </div>
              </div>
              
              <rtk-simple-grid 
                *ngIf="hostParticipant"
                id="viewer-grid" 
                class="video-grid"
              ></rtk-simple-grid>
            </div>
          </rtk-ui-provider>
        </div>
      </div>
    </div>
  `,
  styles: [`
    * {
      box-sizing: border-box;
    }

    .viewer-container {
      height: 100vh;
      height: 100dvh; /* Dynamic viewport height for mobile */
      display: flex;
      flex-direction: column;
      background: #1a1a1a;
      overflow: hidden;
    }
    
    .join-screen {
      max-width: 400px;
      margin: 100px auto;
      padding: 30px;
      text-align: center;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .join-screen h1 {
      margin-top: 0;
      margin-bottom: 24px;
      color: #1a1a1a;
      font-size: 24px;
    }
    
    .input-field {
      width: 100%;
      padding: 12px;
      margin: 10px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }

    .input-field:focus {
      outline: none;
      border-color: #0066ff;
      box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);
    }
    
    .btn-primary {
      width: 100%;
      padding: 12px;
      margin: 20px 0;
      background: #0066ff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: #0052cc;
    }
    
    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .broadcast-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    
    /* Header Bar */
    .broadcast-header {
      padding: 12px 16px;
      background: #2d2d2d;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      gap: 12px;
      border-bottom: 1px solid #444;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .live-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 68, 68, 0.2);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      color: #ff4444;
      white-space: nowrap;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      background: #ff4444;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .viewer-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: #ccc;
      white-space: nowrap;
    }

    .viewer-badge .icon {
      font-size: 16px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-end {
      padding: 8px 16px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background 0.2s;
      white-space: nowrap;
      min-width: 44px;
      height: 40px;
    }

    .btn-end:hover {
      background: #c82333;
    }
    
    .error {
      color: red;
      margin-top: 10px;
      font-size: 14px;
    }
    
    .provider-container {
      display: flex;
      flex: 1;
      width: 100%;
      min-height: 0;
      overflow: hidden;
    }
    
    .meeting-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }
    
    /* Chat Section - Top on mobile, right on desktop */
    .chat-section {
      background: #1e1e1e;
      display: flex;
      flex-direction: column;
      min-height: 0;
      order: 1;
    }

    .chat-header {
      padding: 12px 16px;
      background: #252525;
      border-bottom: 1px solid #333;
      flex-shrink: 0;
    }

    .chat-header h3 {
      margin: 0;
      font-size: 16px;
      color: white;
      font-weight: 600;
    }
    
    .chat-component {
      flex: 1;
      width: 100%;
      min-height: 0;
      overflow: hidden;
    }

    /* Video Section - Bottom on mobile */
    .video-section {
      display: flex;
      flex-direction: column;
      background: #000;
      min-height: 0;
      order: 2;
      position: relative;
    }
    
    .waiting-message {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      color: #fff;
    }

    .waiting-content {
      text-align: center;
      padding: 20px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      margin: 0 auto 16px;
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-top-color: #0066ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .waiting-content p {
      margin: 0;
      font-size: 16px;
      color: #999;
    }
    
    .video-grid {
      flex: 1;
      width: 100%;
      min-height: 0;
    }

    /* Mobile Styles */
    @media (max-width: 768px) {
      .join-screen {
        margin: 40px 20px;
        padding: 24px;
      }

      .join-screen h1 {
        font-size: 22px;
        margin-bottom: 20px;
      }

      .broadcast-header {
        padding: 10px 12px;
      }

      .live-badge {
        padding: 4px 10px;
        font-size: 12px;
      }

      .viewer-badge {
        font-size: 13px;
      }

      .btn-end {
        padding: 6px 14px;
        font-size: 13px;
        height: 36px;
      }

      .provider-container {
        flex-direction: column;
      }

      /* Chat takes 50% on mobile - top position */
      .chat-section {
        height: 50%;
        min-height: 200px;
        max-height: 50%;
        border-bottom: 1px solid #333;
        border-right: none;
      }

      .chat-header {
        padding: 10px 12px;
      }

      .chat-header h3 {
        font-size: 15px;
      }

      /* Video takes remaining 50% on mobile - bottom position */
      .video-section {
        height: 50%;
        max-height: 50%;
        min-height: 0;
      }

      .waiting-content p {
        font-size: 14px;
      }

      .spinner {
        width: 32px;
        height: 32px;
        border-width: 3px;
        margin-bottom: 12px;
      }
    }

    /* Desktop Styles */
    @media (min-width: 769px) {
      .provider-container {
        flex-direction: row;
      }

      /* Video takes most space on desktop - left side */
      .video-section {
        flex: 1;
        order: 1;
      }

      /* Chat sidebar on desktop - right side */
      .chat-section {
        width: 350px;
        border-left: 1px solid #333;
        order: 2;
      }
    }

    /* Large Desktop */
    @media (min-width: 1200px) {
      .chat-section {
        width: 400px;
      }
    }
  `]
})
export class ViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('rtkProvider') rtkProvider!: ElementRef;
  
  private route = inject(ActivatedRoute);
  
  rtkMeeting: RealtimeKitClient | null = null;
  joined = false;
  meetingId = '';
  meetingIdFromUrl = false;
  viewerName = '';
  error = '';
  loading = false;
  hostParticipant: any = null;

  constructor(private apiService: RealtimeApiService) {}

  ngOnInit() {
    // Extract meetingId from query params
    this.route.queryParams.subscribe(params => {
      if (params['meetingId']) {
        this.meetingId = params['meetingId'];
        this.meetingIdFromUrl = true;
        console.log('Meeting ID from URL:', this.meetingId);
      }
    });
  }

  ngAfterViewInit() {}

  async joinBroadcast() {
    if (!this.viewerName.trim()) {
      this.error = 'Please enter your name';
      return;
    }

    if (!this.meetingId.trim()) {
      this.error = 'Meeting ID is required';
      return;
    }

    this.error = '';
    this.loading = true;

    try {
      console.log('Joining meeting:', this.meetingId);

      // Step 1: Add viewer as participant
      const participant = await this.apiService.addParticipant(
        this.meetingId,
        this.viewerName,
        'viewer-preset'
      ).toPromise();

      if (!participant?.authToken) {
        throw new Error('Failed to join meeting');
      }

      console.log('Viewer added as participant');

      // Step 2: Initialize RealtimeKit
      const rtkMeeting = await RealtimeKitClient.init({
        authToken: participant.authToken,
        defaults: {
          video: false,
          audio: false,
        },
      });

      this.rtkMeeting = rtkMeeting;
      this.joined = true;
      this.loading = false;

      console.log('RealtimeKit initialized for viewer');

      // Step 3: Setup UI components after DOM is ready
      setTimeout(() => {
        this.setupUIComponents();
      }, 100);

    } catch (err: any) {
      this.error = 'Failed to join broadcast: ' + err.message;
      this.loading = false;
      console.error('Error joining broadcast:', err);
    }
  }

  private setupUIComponents() {
    if (!this.rtkMeeting) return;

    // Setup provider
    const providerElement = document.getElementById('viewer-provider') as any;
    if (providerElement) {
      providerElement.meeting = this.rtkMeeting;
      console.log('Provider setup complete');
    }

    // Listen for participants joining/leaving
    this.rtkMeeting.participants.joined.on('participantJoined', (participant: any) => {
      console.log('Participant joined:', participant.name);
      this.updateHostParticipant();
    });

    this.rtkMeeting.participants.joined.on('participantLeft', (participant: any) => {
      console.log('Participant left:', participant.name);
      this.updateHostParticipant();
    });

    // Setup event listeners
    this.rtkMeeting.self.on('roomJoined', () => {
      console.log('Viewer joined room successfully');
      this.updateHostParticipant();
    });

    this.rtkMeeting.self.on('roomLeft', () => {
      console.log('Viewer left room');
    });

    // Join the room
    this.rtkMeeting.join();
  }

  private updateHostParticipant() {
    if (!this.rtkMeeting) return;

    // Get all joined participants
    const joinedParticipants = this.rtkMeeting.participants.joined;
    
    // Find the host - first person with video enabled
    const hostCandidate = joinedParticipants.toArray().find((p: any) => p.videoEnabled);
    
    if (hostCandidate && hostCandidate !== this.hostParticipant) {
      this.hostParticipant = hostCandidate;
      console.log('Host found:', hostCandidate.name);
      
      // Update the grid to show only the host
      setTimeout(() => {
        const gridElement = document.getElementById('viewer-grid') as any;
        if (gridElement) {
          gridElement.participants = [hostCandidate];
          console.log('Grid updated to show only host');
        }
      }, 100);
    } else if (!hostCandidate) {
      this.hostParticipant = null;
      console.log('No host found');
    }
  }

  leaveBroadcast() {
    if (this.rtkMeeting) {
      this.rtkMeeting.leave();
      this.rtkMeeting = null;
    }
    this.joined = false;
    this.hostParticipant = null;
  }

  ngOnDestroy() {
    if (this.rtkMeeting) {
      this.rtkMeeting.leave();
    }
  }
}