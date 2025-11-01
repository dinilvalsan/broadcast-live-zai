import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // This is critical for Web Components
  template: `
    <nav class="navbar">
      <div class="nav-container">
        <h1>RealtimeKit Broadcast</h1>
        <div class="nav-links">
          <a routerLink="/host" routerLinkActive="active">Host</a>
          <a routerLink="/viewer" routerLinkActive="active">Viewer</a>
        </div>
      </div>
    </nav>
    <router-outlet />
  `,
  styles: [`
    .navbar {
      background: #1a1a1a;
      color: white;
      padding: 1rem;
    }
    
    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .nav-links a {
      color: white;
      text-decoration: none;
      margin-left: 20px;
      padding: 8px 16px;
      border-radius: 4px;
    }
    
    .nav-links a:hover {
      background: rgba(255,255,255,0.1);
    }
    
    .nav-links a.active {
      background: #0066ff;
    }
  `]
})
export class AppComponent {
  title = 'realtime-frontend';
}