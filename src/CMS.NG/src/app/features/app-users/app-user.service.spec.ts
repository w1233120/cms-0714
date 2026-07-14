import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@env';

import { AppUserService } from './app-user.service';
import { AppUser, AppUserRequest } from './app-user.model';

describe('AppUserService', () => {
  let service: AppUserService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/appusers`;

  const user: AppUser = {
    pkid: 1,
    userId: 'helen',
    userName: 'Helen Wu',
    isActive: true,
    passwordUpdatedTime: null,
    roleCount: 1,
    roleIds: ['Admin']
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(AppUserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll issues GET to the collection URL', () => {
    service.getAll().subscribe((result) => expect(result).toEqual([user]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([user]);
  });

  it('query issues POST to /query with the filter body', () => {
    const query = { keyword: 'hel', isActive: true };
    service.query(query).subscribe((result) => expect(result).toEqual([user]));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([user]);
  });

  it('getById encodes the string PK', () => {
    service.getById('a b/c').subscribe((result) => expect(result).toEqual(user));

    const req = httpMock.expectOne(`${baseUrl}/a%20b%2Fc`);
    expect(req.request.method).toBe('GET');
    req.flush(user);
  });

  it('create issues POST to the collection URL without a password field', () => {
    const request: AppUserRequest = {
      userId: 'amy',
      userName: 'Amy Chen',
      isActive: true,
      roleIds: []
    };

    service.create(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(Object.keys(req.request.body as object)).not.toContain('passwordHash');
    req.flush({ ...user, userId: 'amy', userName: 'Amy Chen' });
  });

  it('update issues PUT to the collection URL with userId in the body', () => {
    const request: AppUserRequest = {
      userId: 'helen',
      userName: 'Helen Wu（修訂）',
      isActive: false,
      roleIds: ['Admin']
    };

    service.update(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush({ ...user, userName: 'Helen Wu（修訂）', isActive: false });
  });

  it('delete encodes the string PK', () => {
    service.delete('a b/c').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/a%20b%2Fc`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('resetPassword issues POST to the reset-password URL with an encoded PK', () => {
    service.resetPassword('a b/c').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/a%20b%2Fc/reset-password`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });
});
