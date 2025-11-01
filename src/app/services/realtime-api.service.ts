import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Meeting {
  id: string;
  title: string;
}

export interface Participant {
  id: string;
  authToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeApiService {
  private apiUrl = environment.workerApiUrl;

  constructor(private http: HttpClient) {}

  createMeeting(title: string): Observable<Meeting> {
    return this.http.post<Meeting>(`${this.apiUrl}/api/meeting/create`, { title });
  }

  addParticipant(
    meetingId: string, 
    name: string, 
    presetName: string
  ): Observable<Participant> {
    return this.http.post<Participant>(`${this.apiUrl}/api/participant/add`, {
      meetingId,
      name,
      presetName
    });
  }
}