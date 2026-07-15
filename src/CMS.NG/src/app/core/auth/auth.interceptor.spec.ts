import { HttpClient } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '@env';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;

  function setProfile(token: string): void {
    sessionStorage.setItem(
      'cms-auth',
      JSON.stringify({ userId: 'helen', userName: 'Helen Wu', accessToken: token })
    );
  }

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('attaches the Bearer token to API requests when signed in', () => {
    setProfile('the-token');
    // Re-read: AuthService reads session storage at construction, so instantiate after setting it.
    TestBed.inject(AuthService);

    http.get(`${environment.apiUrl}/approles`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/approles`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer the-token');
    req.flush([]);
  });

  it('does not attach a header when there is no token', () => {
    http.get(`${environment.apiUrl}/approles`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/approles`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('clears session storage and redirects to /login on a 401', () => {
    setProfile('the-token');
    const auth = TestBed.inject(AuthService);
    const navigateSpy = spyOn(router, 'navigate');

    http.get(`${environment.apiUrl}/approles`).subscribe({ error: () => {} });

    const req = httpMock.expectOne(`${environment.apiUrl}/approles`);
    req.flush('nope', { status: 401, statusText: 'Unauthorized' });

    expect(sessionStorage.getItem('cms-auth')).toBeNull();
    expect(auth.isAuthenticated()).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
