import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';

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

describe('App', () => {
  beforeEach(async () => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the shell with the signed-in user name when authenticated', () => {
    signIn(['Admin']);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.topbar__brand')?.textContent).toContain('CMS');
    expect(compiled.querySelector('.topbar__username')?.textContent).toContain('Helen Wu');
    expect(compiled.textContent).toContain('角色 AppRole');
  });

  it('shows the 系統管理 Admin group only for users whose roles include Admin', () => {
    signIn(['Admin']);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('系統管理 Admin');
  });

  it('hides the 系統管理 Admin group for non-Admin users', () => {
    signIn(['User']);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('系統管理 Admin');
    // A non-admin group still shows.
    expect(text).toContain('課程管理 Course');
  });

  it('does not render the shell when unauthenticated', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.app-shell')).toBeNull();
  });

  it('logs out via the AuthService', () => {
    signIn(['Admin']);
    const auth = TestBed.inject(AuthService);
    const logoutSpy = spyOn(auth, 'logout');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const logoutButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.topbar__logout'
    ) as HTMLButtonElement;
    logoutButton.click();
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('collapses and expands a nav group when its header is clicked', () => {
    signIn(['Admin']);
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    expect(app['isExpanded']('系統管理 Admin')).toBeTrue();

    app['toggleGroup']('系統管理 Admin');
    fixture.detectChanges();
    expect(app['isExpanded']('系統管理 Admin')).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('角色 AppRole');

    app['toggleGroup']('系統管理 Admin');
    fixture.detectChanges();
    expect(app['isExpanded']('系統管理 Admin')).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('角色 AppRole');
  });

  it('toggles the sidebar collapsed state', () => {
    signIn(['Admin']);
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    const shell = () => (fixture.nativeElement as HTMLElement).querySelector('.app-shell');
    expect(shell()?.classList).not.toContain('app-shell--collapsed');

    app['toggleSidebar']();
    fixture.detectChanges();
    expect(shell()?.classList).toContain('app-shell--collapsed');
  });
});
