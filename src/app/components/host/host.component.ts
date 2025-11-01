import { Component, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RealtimeApiService } from '../../services/realtime-api.service';
import RealtimeKitClient from '@cloudflare/realtimekit';

@Component({
  selector: 'app-host',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="host-container">
      <div *ngIf="!meetingStarted" class="setup-screen">
        <h1>Start Your Broadcast</h1>
        <input 
          [(ngModel)]="hostName" 
          placeholder="Your name"
          class="input-field"
        />
        <input 
          [(ngModel)]="meetingTitle" 
          placeholder="Broadcast title"
          class="input-field"
        />
        <button (click)="startBroadcast()" class="btn-primary" [disabled]="loading">
          {{ loading ? 'Starting...' : 'Start Broadcasting' }}
        </button>
        <p *ngIf="error" class="error">{{ error }}</p>
      </div>

      <div *ngIf="meetingStarted && meetingId" class="broadcast-container">
        <div class="broadcast-info">
          <div class="left-section">
            <h2>🔴 Live - Broadcasting</h2>
            <div class="viewer-stats">
              <span class="viewer-count">
                <span class="icon">👥</span>
                <strong>{{ viewerCount }}</strong> {{ viewerCount === 1 ? 'viewer' : 'viewers' }} watching
              </span>
              <button (click)="toggleViewerList()" class="btn-viewers">
                {{ showViewerList ? 'Hide' : 'Show' }} Viewers
              </button>
            </div>
          </div>
          <div class="meeting-actions">
            <div class="meeting-id">
              <strong>Meeting ID:</strong> {{ meetingId }}
              <button (click)="copyMeetingId()" class="btn-copy">Copy</button>
            </div>
            <button (click)="stopBroadcast()" class="btn-danger">Stop & Leave</button>
          </div>
        </div>

        <!-- Viewer List Panel -->
        <div *ngIf="showViewerList" class="viewer-list-panel">
          <div class="viewer-list-header">
            <h3>Active Viewers ({{ viewers.length }})</h3>
            <button (click)="toggleViewerList()" class="btn-close">✕</button>
          </div>
          <div class="viewer-list-content">
            <div *ngIf="viewers.length === 0" class="no-viewers">
              No viewers yet. Share the meeting ID to invite people.
            </div>
            <div *ngFor="let viewer of viewers" class="viewer-item">
              <span class="viewer-avatar">{{ getInitials(viewer.name) }}</span>
              <div class="viewer-info">
                <span class="viewer-name">{{ viewer.name }}</span>
                <span class="viewer-status" [class.active]="viewer.audioEnabled || viewer.videoEnabled">
                  {{ viewer.audioEnabled ? '🎤' : '' }}
                  {{ viewer.videoEnabled ? '📹' : '' }}
                  {{ !viewer.audioEnabled && !viewer.videoEnabled ? '👁️ Watching' : '' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="meeting-layout">
          <rtk-ui-provider #rtkProvider id="host-provider" class="provider-container">
            <!-- Video Grid Section - Only shows self (host) -->
            <div class="video-section">
              <rtk-simple-grid 
                id="host-grid" 
                class="video-grid"
              ></rtk-simple-grid>
              
              <!-- Controls -->
              <div class="controls">
                <rtk-mic-toggle id="host-mic"></rtk-mic-toggle>
                <rtk-camera-toggle id="host-camera"></rtk-camera-toggle>
                <rtk-leave-button id="host-leave" (click)="stopBroadcast()"></rtk-leave-button>
              </div>
            </div>
            
            <!-- Chat Sidebar -->
            <div class="chat-section">
              <rtk-chat id="host-chat" class="chat-component"></rtk-chat>
            </div>
          </rtk-ui-provider>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .host-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #1a1a1a;
    }
    
    .setup-screen {
      max-width: 400px;
      margin: 100px auto;
      padding: 30px;
      text-align: center;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .input-field {
      width: 100%;
      padding: 12px;
      margin: 10px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
      box-sizing: border-box;
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
      height: 100vh;
    }
    
    .broadcast-info {
      padding: 15px 20px;
      background: #2d2d2d;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      gap: 20px;
    }

    .left-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .broadcast-info h2 {
      margin: 0;
      font-size: 18px;
      color: #ff4444;
    }

    .viewer-stats {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .viewer-count {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: #ccc;
    }

    .viewer-count .icon {
      font-size: 16px;
    }

    .btn-viewers {
      padding: 4px 10px;
      background: #4a4a4a;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .btn-viewers:hover {
      background: #5a5a5a;
    }

    .meeting-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .meeting-id {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
    }
    
    .btn-copy {
      padding: 6px 12px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .btn-copy:hover {
      background: #218838;
    }

    .btn-danger {
      padding: 6px 12px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    /* Viewer List Panel */
    .viewer-list-panel {
      background: #2a2a2a;
      border-bottom: 1px solid #444;
      max-height: 300px;
      display: flex;
      flex-direction: column;
    }

    .viewer-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      border-bottom: 1px solid #444;
      color: white;
    }

    .viewer-list-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #ccc;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-close:hover {
      color: white;
    }

    .viewer-list-content {
      overflow-y: auto;
      padding: 10px 20px;
    }

    .no-viewers {
      text-align: center;
      padding: 20px;
      color: #888;
      font-size: 14px;
    }

    .viewer-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      background: #333;
      border-radius: 6px;
      margin-bottom: 8px;
      color: white;
    }

    .viewer-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #0066ff;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      flex-shrink: 0;
    }

    .viewer-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .viewer-name {
      font-weight: 500;
      font-size: 14px;
    }

    .viewer-status {
      font-size: 12px;
      color: #888;
    }

    .viewer-status.active {
      color: #28a745;
    }
    
    .error {
      color: red;
      margin-top: 10px;
    }
    
    .provider-container {
      display: flex;
      flex: 1;
      width: 100%;
      height: 100%;
    }
    
    .meeting-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    
    .video-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #000;
    }
    
    .video-grid {
      flex: 1;
      width: 100%;
    }
    
    .controls {
      display: flex;
      justify-content: center;
      gap: 15px;
      padding: 20px;
      background: #2d2d2d;
    }
    
    .chat-section {
      width: 350px;
      background: #1e1e1e;
      border-left: 1px solid #333;
      display: flex;
      flex-direction: column;
    }
    
    .chat-component {
      flex: 1;
      width: 100%;
      height: 100%;
    }
  `]
})
export class HostComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rtkProvider') rtkProvider!: ElementRef;
  
  rtkMeeting: RealtimeKitClient | null = null;
  meetingStarted = false;
  meetingId = '';
  hostName = '';
  meetingTitle = 'Live Broadcast';
  error = '';
  loading = false;
  hasJoinedRoom = false; // Guard flag to prevent double join
  
  // Viewer stats
  viewerCount = 0;
  viewers: any[] = [];
  showViewerList = false;

  constructor(private apiService: RealtimeApiService) {}

  ngAfterViewInit() {}

  async startBroadcast() {
    if (!this.hostName.trim()) {
      this.error = 'Please enter your name';
      return;
    }

    this.error = '';
    this.loading = true;

    try {
      // Step 1: Create meeting
      const meeting = await this.apiService.createMeeting(this.meetingTitle).toPromise();
      
      if (!meeting?.id) {
        throw new Error('Failed to create meeting');
      }

      this.meetingId = meeting.id;
      console.log('Meeting created:', meeting.id);

      // Step 2: Add host as participant
      const participant = await this.apiService.addParticipant(
        meeting.id,
        this.hostName,
        'host-preset'
      ).toPromise();

      if (!participant?.authToken) {
        throw new Error('Failed to add participant');
      }

      console.log('Host added as participant');

      // Step 3: Initialize RealtimeKit
      const rtkMeeting = await RealtimeKitClient.init({
        authToken: participant.authToken,
        defaults: {
          video: true,
          audio: true,
        },
      });

      this.rtkMeeting = rtkMeeting;
      this.meetingStarted = true;
      this.loading = false;

      console.log('RealtimeKit initialized');

      // Step 4: Setup UI components after DOM is ready
      setTimeout(() => {
        this.setupUIComponents();
      }, 100);

    } catch (err: any) {
      this.error = 'Failed to start broadcast: ' + err.message;
      this.loading = false;
      console.error('Error starting broadcast:', err);
    }
  }

  private setupUIComponents() {
    if (!this.rtkMeeting || this.hasJoinedRoom) {
      console.log('Already joined or no meeting');
      return;
    }

    // Setup provider
    const providerElement = document.getElementById('host-provider') as any;
    if (providerElement) {
      providerElement.meeting = this.rtkMeeting;
      console.log('Provider setup complete');
    }

    // Setup participant event listeners BEFORE joining
    this.rtkMeeting.participants.joined.on('participantJoined', (participant: any) => {
      console.log('Viewer joined:', participant.name);
      this.updateViewerList();
    });

    this.rtkMeeting.participants.joined.on('participantLeft', (participant: any) => {
      console.log('Viewer left:', participant.name);
      this.updateViewerList();
    });

    // Setup room event listeners
    this.rtkMeeting.self.on('roomJoined', () => {
      console.log('Host joined room successfully');
      this.hasJoinedRoom = true;
      
      // After joining, set grid to show only host (self)
      this.updateHostGrid();
      this.updateViewerList();
    });
    
    this.rtkMeeting.self.on('roomLeft', () => {
      console.log('Host left room');
      this.hasJoinedRoom = false;
    });

    // Join the room - only call this once!
    try {
      this.rtkMeeting.join();
      console.log('Join method called');
    } catch (error) {
      console.error('Error calling join:', error);
    }
  }

  private updateHostGrid() {
    if (!this.rtkMeeting) return;

    // For host, only show their own video (self)
    setTimeout(() => {
      const gridElement = document.getElementById('host-grid') as any;
      if (gridElement && this.rtkMeeting) {
        // Set grid to only show the host's own video
        gridElement.participants = [this.rtkMeeting.self];
        console.log('Host grid updated to show only self');
      }
    }, 100);
  }

  private updateViewerList() {
    if (!this.rtkMeeting) return;

    // Get all joined participants (excludes self)
    const joinedParticipants = this.rtkMeeting.participants.joined.toArray();
    
    this.viewers = joinedParticipants.map((p: any) => ({
      id: p.id,
      name: p.name || 'Anonymous',
      audioEnabled: p.audioEnabled || false,
      videoEnabled: p.videoEnabled || false,
    }));

    this.viewerCount = this.viewers.length;
    
    console.log(`Viewer count updated: ${this.viewerCount}`);
  }

  toggleViewerList() {
    this.showViewerList = !this.showViewerList;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  stopBroadcast() {
    if (this.rtkMeeting && this.hasJoinedRoom) {
      try {
        this.rtkMeeting.leave();
      } catch (error) {
        console.error('Error leaving room:', error);
      }
      this.rtkMeeting = null;
    }
    this.meetingStarted = false;
    this.meetingId = '';
    this.hasJoinedRoom = false;
    this.viewerCount = 0;
    this.viewers = [];
    this.showViewerList = false;
  }

  copyMeetingId() {
    navigator.clipboard.writeText(this.meetingId);
    alert('Meeting ID copied to clipboard!');
  }

  ngOnDestroy() {
    if (this.rtkMeeting && this.hasJoinedRoom) {
      try {
        this.rtkMeeting.leave();
      } catch (error) {
        console.error('Error leaving room on destroy:', error);
      }
    }
  }
}