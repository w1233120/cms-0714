import { HttpClient } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { environment } from '@env';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;
  let messageService: MessageService;

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
        provideRouter([]),
        MessageService
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    messageService = TestBed.inject(MessageService);
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

  it('surfaces a friendly error toast with the safe message on a 500', () => {
    const addSpy = spyOn(messageService, 'add');
    const navigateSpy = spyOn(router, 'navigate');

    http.get(`${environment.apiUrl}/approles`).subscribe({ error: () => {} });

    const req = httpMock.expectOne(`${environment.apiUrl}/approles`);
    req.flush(
      { message: 'An unexpected error occurred.' },
      { status: 500, statusText: 'Internal Server Error' }
    );

    expect(addSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'error', detail: 'An unexpected error occurred.' })
    );
    // A 500 is not an auth failure: the session stays, no redirect to login.
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('cms-auth')).toBeNull();
  });

  it('falls back to a generic toast when a 500 body has no message', () => {
    const addSpy = spyOn(messageService, 'add');

    http.get(`${environment.apiUrl}/approles`).subscribe({ error: () => {} });

    const req = httpMock.expectOne(`${environment.apiUrl}/approles`);
    req.flush('boom', { status: 503, statusText: 'Service Unavailable' });

    expect(addSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'error', detail: jasmine.stringContaining('An unexpected error occurred.') })
    );
  });

  it('does not toast on a validation 400 (forms handle it)', () => {
    const addSpy = spyOn(messageService, 'add');
    const navigateSpy = spyOn(router, 'navigate');

    http.get(`${environment.apiUrl}/approles`).subscribe({ error: () => {} });

    const req = httpMock.expectOne(`${environment.apiUrl}/approles`);
    req.flush({ message: 'UserName is required.' }, { status: 400, statusText: 'Bad Request' });

    expect(addSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
