// src/app/components/host/host.component.ts
import { Component, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
        <!-- Header Bar -->
        <div class="broadcast-header">
          <div class="header-content">
            <div class="live-badge">
              <span class="live-dot"></span>
              <span>LIVE</span>
            </div>
            <div class="viewer-count-badge">
              <span class="icon">👥</span>
              <strong>{{ viewerCount }}</strong>
            </div>
          </div>
          <div class="header-actions">
            <button (click)="toggleViewerList()" class="btn-icon" [class.active]="showViewerList">
              <span>{{ showViewerList ? '✕' : '👥' }}</span>
            </button>
            <button (click)="stopBroadcast()" class="btn-end">End</button>
          </div>
        </div>

        <!-- Share Panel -->
        <div class="share-panel">
          <div class="share-content">
            <span class="share-label">Share link:</span>
            <div class="share-url-container">
              <input 
                type="text" 
                [value]="shareableUrl" 
                readonly 
                class="share-url-input"
                #shareInput
              />
              <button (click)="copyShareUrl()" class="btn-copy-url">
                {{ urlCopied ? '✓ Copied' : 'Copy' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Viewer List Panel (Collapsible) -->
        <div *ngIf="showViewerList" class="viewer-list-panel">
          <div class="viewer-list-content">
            <div *ngIf="viewers.length === 0" class="no-viewers">
              No viewers yet. Share the link to invite people.
            </div>
            <div *ngFor="let viewer of viewers" class="viewer-item">
              <span class="viewer-avatar">{{ getInitials(viewer.name) }}</span>
              <div class="viewer-info">
                <span class="viewer-name">{{ viewer.name }}</span>
                <span class="viewer-status" [class.active]="viewer.audioEnabled || viewer.videoEnabled">
                  {{ !viewer.audioEnabled && !viewer.videoEnabled ? 'Watching' : 'Active' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="meeting-layout">
          <rtk-ui-provider #rtkProvider id="host-provider" class="provider-container">
            <!-- Chat Section (Top on Mobile) -->
            <div class="chat-section">
              <div class="chat-header">
                <h3>💬 Chat</h3>
              </div>
              <rtk-chat id="host-chat" class="chat-component"></rtk-chat>
            </div>

            <!-- Video Section (Bottom on Mobile) -->
            <div class="video-section">
              <rtk-simple-grid 
                id="host-grid" 
                class="video-grid"
              ></rtk-simple-grid>
              
              <!-- Controls -->
              <div class="controls">
                <rtk-mic-toggle id="host-mic"></rtk-mic-toggle>
                <rtk-camera-toggle id="host-camera"></rtk-camera-toggle>
              </div>
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

    .host-container {
      height: 100vh;
      height: 100dvh; /* Dynamic viewport height for mobile */
      display: flex;
      flex-direction: column;
      background: #1a1a1a;
      overflow: hidden;
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

    .viewer-count-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: #ccc;
      white-space: nowrap;
    }

    .viewer-count-badge .icon {
      font-size: 16px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-icon {
      padding: 8px 12px;
      background: #4a4a4a;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      transition: background 0.2s;
      min-width: 44px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-icon:hover, .btn-icon.active {
      background: #5a5a5a;
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

    /* Share Panel */
    .share-panel {
      background: #252525;
      border-bottom: 1px solid #444;
      padding: 12px 16px;
      flex-shrink: 0;
    }

    .share-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .share-label {
      font-size: 12px;
      color: #aaa;
      font-weight: 500;
    }

    .share-url-container {
      display: flex;
      gap: 8px;
    }

    .share-url-input {
      flex: 1;
      padding: 10px 12px;
      background: #1a1a1a;
      border: 1px solid #444;
      border-radius: 6px;
      color: white;
      font-size: 13px;
      font-family: monospace;
      min-width: 0;
    }

    .btn-copy-url {
      padding: 10px 16px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: background 0.2s;
      white-space: nowrap;
      min-width: 70px;
    }

    .btn-copy-url:hover {
      background: #218838;
    }

    /* Viewer List Panel */
    .viewer-list-panel {
      background: #2a2a2a;
      border-bottom: 1px solid #444;
      max-height: 200px;
      overflow-y: auto;
      flex-shrink: 0;
    }

    .viewer-list-content {
      padding: 12px 16px;
    }

    .no-viewers {
      text-align: center;
      padding: 16px;
      color: #888;
      font-size: 13px;
    }

    .viewer-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      background: #333;
      border-radius: 8px;
      margin-bottom: 8px;
      color: white;
    }

    .viewer-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #0066ff;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 12px;
      flex-shrink: 0;
    }

    .viewer-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .viewer-name {
      font-weight: 500;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .viewer-status {
      font-size: 11px;
      color: #888;
    }

    .viewer-status.active {
      color: #28a745;
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
    }
    
    .video-grid {
      flex: 1;
      width: 100%;
      min-height: 0;
    }
    
    .controls {
      display: flex;
      justify-content: center;
      gap: 15px;
      padding: 16px;
      background: #2d2d2d;
      flex-shrink: 0;
    }

    /* Mobile Styles */
    @media (max-width: 768px) {
      .setup-screen {
        margin: 40px 20px;
        padding: 24px;
      }

      .broadcast-header {
        padding: 10px 12px;
      }

      .live-badge {
        padding: 4px 10px;
        font-size: 12px;
      }

      .viewer-count-badge {
        font-size: 13px;
      }

      .btn-icon {
        padding: 6px 10px;
        font-size: 14px;
        min-width: 40px;
        height: 36px;
      }

      .btn-end {
        padding: 6px 14px;
        font-size: 13px;
        height: 36px;
      }

      .share-panel {
        padding: 10px 12px;
      }

      .share-url-input {
        font-size: 12px;
        padding: 8px 10px;
      }

      .btn-copy-url {
        padding: 8px 14px;
        font-size: 12px;
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

      .controls {
        padding: 12px;
        gap: 12px;
      }

      .viewer-list-panel {
        max-height: 150px;
      }

      .viewer-item {
        padding: 8px;
        margin-bottom: 6px;
      }

      .viewer-avatar {
        width: 28px;
        height: 28px;
        font-size: 11px;
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

      .share-content {
        flex-direction: row;
        align-items: center;
        gap: 12px;
      }

      .share-label {
        white-space: nowrap;
      }

      .share-url-container {
        flex: 1;
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
export class HostComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rtkProvider') rtkProvider!: ElementRef;
  
  private router = inject(Router);
  
  rtkMeeting: RealtimeKitClient | null = null;
  meetingStarted = false;
  meetingId = '';
  hostName = '';
  meetingTitle = 'Live Broadcast';
  error = '';
  loading = false;
  hasJoinedRoom = false;
  
  // Viewer stats
  viewerCount = 0;
  viewers: any[] = [];
  showViewerList = false;
  
  // Shareable URL
  shareableUrl = '';
  urlCopied = false;

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

      // Generate shareable URL
      const baseUrl = window.location.origin;
      this.shareableUrl = `${baseUrl}/viewer?meetingId=${this.meetingId}`;

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
      
      this.updateHostGrid();
      this.updateViewerList();
    });
    
    this.rtkMeeting.self.on('roomLeft', () => {
      console.log('Host left room');
      this.hasJoinedRoom = false;
    });

    // Join the room
    try {
      this.rtkMeeting.join();
      console.log('Join method called');
    } catch (error) {
      console.error('Error calling join:', error);
    }
  }

  private updateHostGrid() {
    if (!this.rtkMeeting) return;

    setTimeout(() => {
      const gridElement = document.getElementById('host-grid') as any;
      if (gridElement && this.rtkMeeting) {
        gridElement.participants = [this.rtkMeeting.self];
        console.log('Host grid updated to show only self');
      }
    }, 100);
  }

  private updateViewerList() {
    if (!this.rtkMeeting) return;

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

  copyShareUrl() {
    navigator.clipboard.writeText(this.shareableUrl).then(() => {
      this.urlCopied = true;
      setTimeout(() => {
        this.urlCopied = false;
      }, 2000);
    });
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
    this.shareableUrl = '';
    this.urlCopied = false;
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