import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env';

// The profile stored after login. `accessToken` is the JWT; the user's roles live inside
// it as claims (never fetched separately).
export interface UserProfile {
  userId: string;
  userName: string;
  accessToken: string;
}

// The identity + updated name returned by PUT /api/auth/profile.
export interface ProfileUpdate {
  userId: string;
  userName: string;
}

// The backend issues role claims under the .NET ClaimTypes.Role URI (it is not shortened
// to "role" on the way out), so that is the key we read from the decoded token payload.
const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

const STORAGE_KEY = 'cms-auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Session storage (per-tab, cleared when the tab closes) — never localStorage.
  private readonly profileSignal = signal<UserProfile | null>(readProfile());

  readonly profile = this.profileSignal.asReadonly();
  readonly userId = computed(() => this.profileSignal()?.userId ?? '');
  readonly userName = computed(() => this.profileSignal()?.userName ?? '');
  readonly isAuthenticated = computed(() => this.profileSignal() !== null);
  readonly roles = computed(() => decodeRoles(this.profileSignal()?.accessToken));
  readonly isAdmin = computed(() => this.roles().includes('Admin'));

  get token(): string | null {
    return this.profileSignal()?.accessToken ?? null;
  }

  login(userId: string, password: string): Observable<UserProfile> {
    return this.http
      .post<UserProfile>(`${environment.apiUrl}/Auth/login`, { userId, password })
      .pipe(tap((profile) => this.store(profile)));
  }

  // Update the signed-in user's display name. The backend takes the target user from the
  // JWT, so the body carries only the new name. On success the stored profile (and thus
  // the app-shell username) is refreshed with the canonical, trimmed value.
  updateUserName(userName: string): Observable<ProfileUpdate> {
    return this.http
      .put<ProfileUpdate>(`${environment.apiUrl}/Auth/profile`, { userName })
      .pipe(tap((updated) => this.applyUserName(updated.userName)));
  }

  // Change the signed-in user's password. The backend takes the target user from the JWT,
  // so the body carries only the plaintext passwords — nothing password-related is ever
  // stored client-side, and no hash crosses the wire.
  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmNewPassword: string
  ): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/Auth/change-password`, {
      currentPassword,
      newPassword,
      confirmNewPassword
    });
  }

  private applyUserName(userName: string): void {
    const current = this.profileSignal();
    if (!current) {
      return;
    }
    this.store({ ...current, userName });
  }

  // Explicit sign-out: clear session and return to the login page.
  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  // Drop the stored profile without navigating — used by the interceptor on a 401 before
  // it redirects, so the guard sees an unauthenticated state.
  clearSession(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.profileSignal.set(null);
  }

  private store(profile: UserProfile): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    this.profileSignal.set(profile);
  }
}

function readProfile(): UserProfile | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as UserProfile;
    return parsed?.accessToken ? parsed : null;
  } catch {
    return null;
  }
}

function decodeRoles(token: string | undefined): string[] {
  if (!token) {
    return [];
  }
  const payload = decodeJwtPayload(token);
  const claim = payload?.[ROLE_CLAIM];
  if (Array.isArray(claim)) {
    return claim.map(String);
  }
  return typeof claim === 'string' ? [claim] : [];
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split('.');
  if (segments.length !== 3) {
    return null;
  }
  try {
    const base64 = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
