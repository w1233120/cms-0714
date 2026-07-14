import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env';
import { AppUser, AppUserQuery, AppUserRequest } from './app-user.model';

@Injectable({ providedIn: 'root' })
export class AppUserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/appusers`;

  getAll(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(this.baseUrl);
  }

  query(query: AppUserQuery): Observable<AppUser[]> {
    return this.http.post<AppUser[]>(`${this.baseUrl}/query`, query);
  }

  getById(userId: string): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.baseUrl}/${encodeURIComponent(userId)}`);
  }

  create(request: AppUserRequest): Observable<AppUser> {
    return this.http.post<AppUser>(this.baseUrl, request);
  }

  update(request: AppUserRequest): Observable<AppUser> {
    return this.http.put<AppUser>(this.baseUrl, request);
  }

  delete(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(userId)}`);
  }

  resetPassword(userId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${encodeURIComponent(userId)}/reset-password`, {});
  }
}
