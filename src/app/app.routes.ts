import { Routes } from '@angular/router';
import { HostComponent } from './components/host/host.component';
import { ViewerComponent } from './components/viewer/viewer.component';

export const routes: Routes = [
  { path: '', redirectTo: '/viewer', pathMatch: 'full' },
  { path: 'host', component: HostComponent },
  { path: 'viewer', component: ViewerComponent },
];