import { Component, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
        <h1>Join Broadcast</h1>
        <input 
          [(ngModel)]="viewerName" 
          placeholder="Your name"
          class="input-field"
        />
        <input 
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
        <div class="viewer-info">
          <h2>👁️ Viewing Live Broadcast</h2>
          <button (click)="leaveBroadcast()" class="btn-leave">Leave</button>
        </div>

        <div class="meeting-layout">
          <rtk-ui-provider #rtkProvider id="viewer-provider" class="provider-container">
            <!-- Video Section - Only shows host -->
            <div class="video-section">
              <div *ngIf="!hostParticipant" class="waiting-message">
                <p>Waiting for host to start broadcasting...</p>
              </div>
              
              <rtk-simple-grid 
                *ngIf="hostParticipant"
                id="viewer-grid" 
                class="video-grid"
              ></rtk-simple-grid>
            </div>
            
            <!-- Chat Sidebar -->
            <div class="chat-section">
              <rtk-chat id="viewer-chat" class="chat-component"></rtk-chat>
            </div>
          </rtk-ui-provider>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .viewer-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #1a1a1a;
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

    .viewer-info {
      padding: 15px 20px;
      background: #2d2d2d;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .viewer-info h2 {
      margin: 0;
      font-size: 18px;
    }

    .btn-leave {
      padding: 8px 16px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }

    .btn-leave:hover {
      background: #c82333;
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
      position: relative;
    }
    
    .waiting-message {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #fff;
      font-size: 18px;
    }
    
    .video-grid {
      flex: 1;
      width: 100%;
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
export class ViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rtkProvider') rtkProvider!: ElementRef;
  
  rtkMeeting: RealtimeKitClient | null = null;
  joined = false;
  meetingId = '';
  viewerName = '';
  error = '';
  loading = false;
  hostParticipant: any = null;

  constructor(private apiService: RealtimeApiService) {}

  ngAfterViewInit() {}

  async joinBroadcast() {
    if (!this.viewerName.trim() || !this.meetingId.trim()) {
      this.error = 'Please enter your name and meeting ID';
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

    // IMPORTANT: Use join() not joinRoom()
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