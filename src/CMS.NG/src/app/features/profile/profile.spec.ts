import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '@env';
import { Profile } from './profile';
import { AuthService } from '../../core/auth/auth.service';

// A JWT whose payload carries the given ClaimTypes.Role claim(s). Only the payload segment
// matters to AuthService — the header and signature are placeholders.
function tokenWithRoles(roles: string[]): string {
  const payload = {
    userId: 'helen',
    userName: 'Helen Wu',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': roles
  };
  const b64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${b64}.signature`;
}

function signIn(roles: string[]): void {
  sessionStorage.setItem(
    'cms-auth',
    JSON.stringify({ userId: 'helen', userName: 'Helen Wu', accessToken: tokenWithRoles(roles) })
  );
}

describe('Profile', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    signIn(['Admin', 'Editor']);

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('shows the UserId and roles read-only (not in an editable input)', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('helen');
    expect(el.textContent).toContain('Admin');
    expect(el.textContent).toContain('Editor');

    // UserName is the only editable profile field — UserId/roles are display-only and never
    // appear in an input (the other inputs are the separate change-password fields).
    const inputs = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    const userNameInput = el.querySelector('#userName') as HTMLInputElement;
    expect(userNameInput.value).toBe('Helen Wu');
    expect(inputs.some((i) => i.value === 'helen')).toBeFalse();
  });

  it('saves an updated UserName and refreshes the shell username + session storage', () => {
    const auth = TestBed.inject(AuthService);
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    input.value = 'Helen W.';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.componentInstance.save();

    const req = httpMock.expectOne(`${environment.apiUrl}/Auth/profile`);
    expect(req.request.method).toBe('PUT');
    // The body carries only the new name — no userId.
    expect(req.request.body).toEqual({ userName: 'Helen W.' });
    req.flush({ userId: 'helen', userName: 'Helen W.' });

    // The app-shell reads auth.userName(); session storage is the source it rehydrates from.
    expect(auth.userName()).toBe('Helen W.');
    expect(JSON.parse(sessionStorage.getItem('cms-auth')!).userName).toBe('Helen W.');
  });

  it('rejects a whitespace-only UserName without calling the backend', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.componentInstance.save();

    httpMock.expectNone(`${environment.apiUrl}/Auth/profile`);
    expect(fixture.componentInstance.form.controls.userName.invalid).toBeTrue();
  });

  // --- Change Password: client-side validation ---

  function setPasswords(
    fixture: ReturnType<typeof TestBed.createComponent<Profile>>,
    current: string,
    next: string,
    confirm: string
  ): void {
    fixture.componentInstance.passwordForm.setValue({
      currentPassword: current,
      newPassword: next,
      confirmNewPassword: confirm
    });
    fixture.detectChanges();
  }

  it('rejects a new password shorter than 8 characters without calling the backend', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    setPasswords(fixture, 'current', 'Ab1!', 'Ab1!');
    fixture.componentInstance.changePassword();

    httpMock.expectNone(`${environment.apiUrl}/Auth/change-password`);
    expect(fixture.componentInstance.passwordForm.controls.newPassword.hasError('complexity')).toBeTrue();
  });

  it('rejects a new password with fewer than 3 character classes without calling the backend', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    // 8 chars, lowercase + digit only = 2 classes.
    setPasswords(fixture, 'current', 'abcdefg1', 'abcdefg1');
    fixture.componentInstance.changePassword();

    httpMock.expectNone(`${environment.apiUrl}/Auth/change-password`);
    expect(fixture.componentInstance.passwordForm.controls.newPassword.hasError('complexity')).toBeTrue();
  });

  it('rejects when new and confirm passwords do not match, without calling the backend', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    setPasswords(fixture, 'current', 'NewPass1!', 'Different1!');
    fixture.componentInstance.changePassword();

    httpMock.expectNone(`${environment.apiUrl}/Auth/change-password`);
    expect(fixture.componentInstance.passwordForm.hasError('mismatch')).toBeTrue();
  });

  it('accepts a complex, matching new password and posts only the plaintext fields', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    setPasswords(fixture, 'current', 'NewPass1!', 'NewPass1!');
    expect(fixture.componentInstance.passwordForm.valid).toBeTrue();

    fixture.componentInstance.changePassword();

    const req = httpMock.expectOne(`${environment.apiUrl}/Auth/change-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      currentPassword: 'current',
      newPassword: 'NewPass1!',
      confirmNewPassword: 'NewPass1!'
    });
    // No password hash — or any hash-like field — is ever sent from the client.
    expect(JSON.stringify(req.request.body).toLowerCase()).not.toContain('hash');
    req.flush(null);

    expect(fixture.componentInstance.passwordSavedMessage()).toBe('密碼已更新 Password changed');
  });

  it('surfaces the backend message when the current password is rejected', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    setPasswords(fixture, 'wrong', 'NewPass1!', 'NewPass1!');
    fixture.componentInstance.changePassword();

    const req = httpMock.expectOne(`${environment.apiUrl}/Auth/change-password`);
    req.flush({ message: '目前密碼不正確 Current password is incorrect' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance.passwordErrorMessage()).toBe('目前密碼不正確 Current password is incorrect');
  });
});
